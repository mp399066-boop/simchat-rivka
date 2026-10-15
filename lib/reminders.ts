/**
 * Reminders the day before a delivery (server only — uses the service role
 * and e-mail). Sent by the daily cron (/api/cron/reminders) and by the
 * manager's "send now" button (/api/reminders/send).
 *
 *   mother    — "tomorrow a breakfast arrives", with a confirmation link
 *   volunteer — what she delivers and what she prepares tomorrow
 *   manager   — tomorrow at a glance: deliveries, confirmations, prep, stock
 */

import { createServerClient } from '@/lib/supabaseServer';
import { esc, frame, isMailConfigured, mailButton, sendMail } from '@/lib/mail';
import { fullDate, israelDate } from '@/lib/dates';
import { fullAddress, STATUS_LABELS, type Mother } from '@/lib/mothers';
import type { MenuItem } from '@/lib/menu';

/** The public address of the site, for links in e-mails. */
export function siteUrl(fallbackOrigin?: string): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return fallbackOrigin ?? 'http://localhost:3000';
}

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

// ── Mother ──────────────────────────────────────────────────────────────────

/** The mother's secret confirmation token (created on first use). */
async function tokenFor(motherId: string): Promise<string> {
  const db = createServerClient();
  const { error: e1 } = await db.from('confirm_tokens')
    .upsert({ mother_id: motherId }, { onConflict: 'mother_id', ignoreDuplicates: true });
  if (e1) throw new Error(`confirm_tokens upsert: ${e1.message}`);
  const { data, error } = await db.from('confirm_tokens').select('token').eq('mother_id', motherId).single();
  if (error || !data) throw new Error(`confirm_tokens read: ${error?.message ?? 'missing'}`);
  return data.token as string;
}

export function motherMail(m: Pick<Mother, 'full_name' | 'delivery_date'>, confirmUrl: string) {
  const date = fullDate(m.delivery_date);
  const html = frame('מחר מגיעה אלייך ארוחת בוקר 💐', `
    <p>שלום ${esc(firstName(m.full_name))},</p>
    <p>מזל טוב! מחר, <strong>${esc(date)}</strong>, תגיע אלייך ארוחת בוקר מארגון שמחת רבקה – לחמניות, ירקות, פשטידות, קינוחים ועוד.</p>
    <p>נשמח שתאשרי שקיבלת את ההודעה:</p>
    <p style="text-align:center">${mailButton(`${confirmUrl}&a=ok`, 'ראיתי, תודה!')}${mailButton(`${confirmUrl}&a=change`, 'צריך לשנות משהו', false)}</p>
    <p style="color:#7D6873;font-size:14px">בתיאבון ובשעה טובה,<br>צוות שמחת רבקה</p>`);
  const text = `שלום ${firstName(m.full_name)},\nמחר, ${date}, תגיע אלייך ארוחת בוקר מארגון שמחת רבקה.\nלאישור: ${confirmUrl}\nצוות שמחת רבקה`;
  return { subject: 'מחר מגיעה אלייך ארוחת בוקר – שמחת רבקה', html, text };
}

/** Sends the reminder to one mother now and records it. */
export async function sendMotherReminder(motherId: string, baseUrl: string): Promise<{ error: string | null }> {
  if (!isMailConfigured()) return { error: 'שליחת מיילים עוד לא הוגדרה' };
  const db = createServerClient();
  const { data: m, error } = await db.from('mothers')
    .select('id, full_name, email, delivery_date').eq('id', motherId).maybeSingle();
  if (error) throw new Error(`mothers read: ${error.message}`);
  if (!m) return { error: 'היולדת לא נמצאה' };
  if (!m.email) return { error: 'אין ליולדת כתובת מייל' };
  if (!m.delivery_date) return { error: 'עוד לא נקבע תאריך משלוח' };

  const url = `${baseUrl}/confirm?t=${await tokenFor(m.id)}`;
  const sent = await sendMail({ to: m.email, ...motherMail(m, url) });
  if (sent.error) return { error: 'שליחת המייל נכשלה' };
  const { error: e2 } = await db.from('mothers').update({ reminder_sent_at: new Date().toISOString() }).eq('id', m.id);
  if (e2) console.error('[sendMotherReminder] could not record sending:', e2.message);
  return { error: null };
}

// ── The daily run ───────────────────────────────────────────────────────────

interface Person { id: string; email: string; full_name: string | null; role: string }
interface Task { mother_id: string; menu_item_id: string; assignee_id: string | null; done: boolean }

export interface DailySummary {
  date: string;
  deliveries: number;
  mothersMailed: number;
  mothersFailed: number;
  volunteersMailed: number;
  managersMailed: number;
  skipped?: string;
}

/** Everything for tomorrow's deliveries. Throws on a database error (the cron alerts). */
export async function runDailyReminders(baseUrl: string): Promise<DailySummary> {
  const date = israelDate(1);
  const summary: DailySummary = { date, deliveries: 0, mothersMailed: 0, mothersFailed: 0, volunteersMailed: 0, managersMailed: 0 };
  if (!isMailConfigured()) return { ...summary, skipped: 'mail not configured' };

  const db = createServerClient();
  const must = <T>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
    return (r.data ?? []) as T;
  };

  // Small, bounded result sets (one day of deliveries; the team; the menu).
  const mothers = must<Mother[]>(await db.from('mothers').select('*')
    .eq('delivery_date', date).not('delivery_status', 'in', '(delivered,cancelled)').order('full_name'), 'mothers');
  summary.deliveries = mothers.length;
  if (!mothers.length) return summary;

  const people = must<Person[]>(await db.from('authorized_users')
    .select('id, email, full_name, role').eq('is_active', true), 'authorized_users');
  const items = must<MenuItem[]>(await db.from('menu_items').select('*').order('sort_order'), 'menu_items');
  const tasks = must<Task[]>(await db.from('prep_tasks')
    .select('mother_id, menu_item_id, assignee_id, done').in('mother_id', mothers.map(m => m.id)), 'prep_tasks');
  const nameOf = (id: string | null) => people.find(p => p.id === id)?.full_name || people.find(p => p.id === id)?.email || '';
  const itemOf = (id: string) => items.find(i => i.id === id);

  // 1. Mothers (once each — reminder_sent_at).
  for (const m of mothers.filter(x => x.email && !x.reminder_sent_at)) {
    const r = await sendMotherReminder(m.id, baseUrl);
    if (r.error) summary.mothersFailed++; else { summary.mothersMailed++; m.reminder_sent_at = new Date().toISOString(); }
  }

  // 2. Volunteers: what each one delivers and prepares tomorrow.
  for (const p of people) {
    const delivers = mothers.filter(m => m.delivery_volunteer_id === p.id);
    const prepares = tasks.filter(t => t.assignee_id === p.id && !t.done);
    if (!delivers.length && !prepares.length) continue;
    const r = await sendMail({ to: p.email, ...volunteerMail(p, date, delivers, prepares.map(t => ({
      item: itemOf(t.menu_item_id), mother: mothers.find(m => m.id === t.mother_id)?.full_name ?? '',
    })), baseUrl) });
    if (!r.error) summary.volunteersMailed++;
  }

  // 3. Managers: the whole picture.
  const meals = mothers.length;
  const missing = items.filter(i => i.is_active && i.per_meal * meals > Math.max(0, i.stock))
    .map(i => `${i.name} – חסר ${i.per_meal * meals - Math.max(0, i.stock)} ${i.unit}`);
  for (const p of people.filter(x => x.role === 'admin')) {
    const r = await sendMail({ to: p.email, ...managerMail(date, mothers, tasks, nameOf, missing, baseUrl) });
    if (!r.error) summary.managersMailed++;
  }
  return summary;
}

function volunteerMail(p: Person, date: string, delivers: Mother[], prepares: { item?: MenuItem; mother: string }[], baseUrl: string) {
  const deliverHtml = delivers.map(m => `
    <div style="background:#FAF2F6;border-radius:14px;padding:12px 14px;margin:8px 0">
      <strong>${esc(m.full_name)}</strong><br>
      ${esc(fullAddress(m) || 'אין כתובת')}${m.address_notes ? ` · ${esc(m.address_notes)}` : ''}<br>
      ${m.phone ? `<span dir="ltr">${esc(m.phone)}</span>` : ''}${m.notes ? `<br><span style="color:#7D6873">${esc(m.notes)}</span>` : ''}
    </div>`).join('');
  const prepHtml = prepares.map(t => `<li>${esc(t.item?.name ?? '')} × ${t.item?.per_meal ?? ''} ${esc(t.item?.unit ?? '')} – לארוחה של ${esc(t.mother)}</li>`).join('');
  const html = frame('המשימות שלך למחר', `
    <p>שלום ${esc(p.full_name ? firstName(p.full_name) : '')}, תודה על העזרה! 💐</p>
    <p>מחר: <strong>${esc(fullDate(date))}</strong></p>
    ${delivers.length ? `<h3 style="margin:16px 0 4px">את מוסרת ל:</h3>${deliverHtml}` : ''}
    ${prepares.length ? `<h3 style="margin:16px 0 4px">להכין:</h3><ul style="margin:0;padding-inline-start:20px">${prepHtml}</ul>` : ''}
    <p style="text-align:center;margin-top:18px">${mailButton(baseUrl, 'פתיחת המערכת')}</p>`);
  const text = `המשימות שלך למחר (${fullDate(date)}):\n`
    + delivers.map(m => `מסירה: ${m.full_name}, ${fullAddress(m)}, ${m.phone ?? ''}`).join('\n') + '\n'
    + prepares.map(t => `הכנה: ${t.item?.name ?? ''} × ${t.item?.per_meal ?? ''} לארוחה של ${t.mother}`).join('\n');
  return { subject: `שמחת רבקה – המשימות שלך למחר`, html, text };
}

function managerMail(date: string, mothers: Mother[], tasks: Task[], nameOf: (id: string | null) => string, missing: string[], baseUrl: string) {
  const rows = mothers.map(m => {
    const t = tasks.filter(x => x.mother_id === m.id);
    const confirm = m.confirm_response === 'ok' ? '✓ אישרה'
      : m.confirm_response === 'change' ? `⚠ ביקשה שינוי${m.confirm_note ? `: ${esc(m.confirm_note)}` : ''}`
      : m.reminder_sent_at ? 'נשלחה תזכורת' : m.email ? 'עוד לא נשלחה תזכורת' : 'אין מייל';
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #F2E4EB"><strong>${esc(m.full_name)}</strong><br><span style="color:#7D6873;font-size:13px">${esc(fullAddress(m))}</span></td>
      <td style="padding:8px;border-bottom:1px solid #F2E4EB">${m.delivery_volunteer_id ? esc(nameOf(m.delivery_volunteer_id)) : '<span style="color:#DC2626">לא שובצה</span>'}</td>
      <td style="padding:8px;border-bottom:1px solid #F2E4EB">${esc(STATUS_LABELS[m.delivery_status])}<br><span style="font-size:13px">הכנות ${t.filter(x => x.done).length}/${t.length}</span></td>
      <td style="padding:8px;border-bottom:1px solid #F2E4EB;font-size:13px">${confirm}</td>
    </tr>`;
  }).join('');
  const html = frame(`מחר: ${mothers.length} משלוחים`, `
    <p><strong>${esc(fullDate(date))}</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="text-align:right;color:#7D6873"><th style="padding:8px">יולדת</th><th style="padding:8px">מוסרת</th><th style="padding:8px">מצב</th><th style="padding:8px">אישור</th></tr>
      ${rows}
    </table>
    ${missing.length ? `<h3 style="margin:18px 0 4px;color:#92400E">חסר במלאי למחר</h3><ul style="margin:0;padding-inline-start:20px">${missing.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p style="color:#15803D">✓ יש מספיק מלאי למחר</p>'}
    <p style="text-align:center;margin-top:18px">${mailButton(baseUrl, 'פתיחת המערכת')}</p>`);
  const text = `מחר (${fullDate(date)}): ${mothers.length} משלוחים\n` + mothers.map(m => `- ${m.full_name}`).join('\n')
    + (missing.length ? `\nחסר במלאי: ${missing.join('; ')}` : '');
  return { subject: `שמחת רבקה – סיכום משלוחים למחר (${mothers.length})`, html, text };
}
