/**
 * צינתוק — a short missed call to the mother's phone, as a reminder (server
 * only). Through a ימות המשיח line (call2all "RunTzintuk" API). Nothing is
 * sent until the line is connected: env TZINTUK_TOKEN ("<line number>:<password>"
 * or an API token) and optionally TZINTUK_CALLER_ID (the number she sees).
 *
 * Sent automatically the evening before (with the e-mail reminders) and on the
 * morning of the delivery (cron in vercel.json → /api/cron/tzintuk/[when]),
 * and by the manager's button (/api/tzintuk/send).
 */

import { createServerClient } from '@/lib/supabaseServer';
import { israelDate } from '@/lib/dates';

const API = 'https://www.call2all.co.il/ym/api/RunTzintuk';

export function isTzintukConfigured(): boolean {
  return !!process.env.TZINTUK_TOKEN;
}

/** An Israeli phone as digits only ("+972 50-1234567" → "0501234567"), or null. */
export function normalizePhone(phone: string | null | undefined): string | null {
  let d = (phone ?? '').replace(/\D/g, '');
  if (d.startsWith('972')) d = `0${d.slice(3)}`;
  return /^0\d{8,9}$/.test(d) ? d : null;
}

/** Rings the given phones once. Returns an error message instead of throwing. Logs no numbers. */
export async function sendTzintuk(phones: string[]): Promise<{ error: string | null }> {
  const token = process.env.TZINTUK_TOKEN;
  if (!token) return { error: 'הצינתוק עוד לא מחובר לקו טלפון' };
  if (!phones.length) return { error: null };
  const body = new URLSearchParams({ token, phones: phones.join(':') });
  if (process.env.TZINTUK_CALLER_ID) body.set('callerId', process.env.TZINTUK_CALLER_ID);
  try {
    const res = await fetch(API, { method: 'POST', body, signal: AbortSignal.timeout(15_000) });
    const data = await res.json().catch(() => null) as { responseStatus?: string; message?: string } | null;
    if (!res.ok || data?.responseStatus !== 'OK') {
      console.error('[sendTzintuk] failed:', res.status, data?.responseStatus, data?.message);
      return { error: 'הצינתוק נכשל' };
    }
    return { error: null };
  } catch (e) {
    console.error('[sendTzintuk] failed:', (e as Error).message);
    return { error: 'הצינתוק נכשל' };
  }
}

/** Manager's button: rings one mother now. */
export async function tzintukMother(motherId: string): Promise<{ error: string | null }> {
  if (!isTzintukConfigured()) return { error: 'הצינתוק עוד לא מחובר לקו טלפון' };
  const { data: m, error } = await createServerClient().from('mothers')
    .select('phone').eq('id', motherId).maybeSingle();
  if (error) throw new Error(`mothers read: ${error.message}`);
  if (!m) return { error: 'היולדת לא נמצאה' };
  const phone = normalizePhone(m.phone);
  if (!phone) return { error: 'אין ליולדת מספר טלפון תקין' };
  return sendTzintuk([phone]);
}

export interface TzintukSummary { date: string; deliveries: number; rung: number; noPhone: number; skipped?: string }

/**
 * Rings every mother whose delivery is on that day (0 = today, 1 = tomorrow)
 * and is not delivered / cancelled. Throws on a database or API error (the cron alerts).
 */
export async function runDailyTzintuk(addDays: 0 | 1): Promise<TzintukSummary> {
  const date = israelDate(addDays);
  const summary: TzintukSummary = { date, deliveries: 0, rung: 0, noPhone: 0 };
  if (!isTzintukConfigured()) return { ...summary, skipped: 'tzintuk not configured' };

  // One day of deliveries — a small, bounded result set.
  const { data, error } = await createServerClient().from('mothers').select('phone')
    .eq('delivery_date', date).not('delivery_status', 'in', '(delivered,cancelled)');
  if (error) throw new Error(`mothers: ${error.message}`);
  summary.deliveries = data.length;
  const phones = [...new Set(data.map(m => normalizePhone(m.phone)).filter((p): p is string => !!p))];
  summary.noPhone = data.length - data.filter(m => normalizePhone(m.phone)).length;
  if (!phones.length) return summary;

  const r = await sendTzintuk(phones);
  if (r.error) throw new Error(r.error);
  summary.rung = phones.length;
  return summary;
}
