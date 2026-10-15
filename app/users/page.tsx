'use client';

import { useMemo, useState } from 'react';
import { useMe } from '@/components/layout/AppShell';
import { useFeedback } from '@/components/ui/Feedback';
import Icon from '@/components/ui/Icon';
import IconButton from '@/components/ui/IconButton';
import PageHero from '@/components/ui/PageHero';
import StatusMessage from '@/components/ui/StatusMessage';
import MailSettingsCard from '@/components/users/MailSettingsCard';
import UserForm, { type UserFormValues } from '@/components/users/UserForm';
import { israelDate } from '@/lib/dates';
import { isOpen, telLink } from '@/lib/mothers';
import { authFetch } from '@/lib/supabase';
import { useMothers } from '@/lib/useMothers';
import { displayName, ROLE_LABELS, tasksLabel, type AuthorizedUser } from '@/lib/users';
import { buttonStyle, card, colors as C, inputStyle } from '@/lib/theme';

type Filter = 'all' | 'deliver' | 'cook' | 'paused';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',     label: 'כולן' },
  { id: 'deliver', label: 'מוסרות' },
  { id: 'cook',    label: 'מבשלות' },
  { id: 'paused',  label: 'מושהות' },
];

interface Stats { deliveries: number; prep: number; doneThisMonth: number }

/** Error text from an API response, or a fallback. */
async function errorText(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === 'string' && res.status !== 401 ? body.error : fallback;
}

/** The team: every volunteer (and manager), what she does and what she has coming up. */
export default function VolunteersPage() {
  const me = useMe();
  const { confirm, toast } = useFeedback();
  const { data, reload, retry } = useMothers(true);
  const [editing, setEditing] = useState<AuthorizedUser | 'new' | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const team = useMemo(() => (data.state === 'ready' ? data.team : []), [data]);
  const isMe = (u: AuthorizedUser) => !!u.email && u.email.toLowerCase() === me.email.toLowerCase();

  // What each one has: upcoming deliveries, open prep tasks, deliveries done this month.
  const stats = useMemo(() => {
    const map = new Map<string, Stats>();
    if (data.state !== 'ready') return map;
    const month = israelDate().slice(0, 7);
    const get = (id: string) => {
      let s = map.get(id);
      if (!s) { s = { deliveries: 0, prep: 0, doneThisMonth: 0 }; map.set(id, s); }
      return s;
    };
    const openMothers = new Set(data.mothers.filter(isOpen).map(m => m.id));
    for (const m of data.mothers) {
      if (!m.delivery_volunteer_id) continue;
      if (isOpen(m)) get(m.delivery_volunteer_id).deliveries++;
      else if (m.delivery_status === 'delivered' && m.delivered_at?.slice(0, 7) === month) get(m.delivery_volunteer_id).doneThisMonth++;
    }
    for (const t of data.prep) if (t.assignee_id && !t.done && openMothers.has(t.mother_id)) get(t.assignee_id).prep++;
    return map;
  }, [data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return team
      .filter(u => filter === 'paused' ? !u.is_active
        : u.is_active && (filter === 'all' || (filter === 'deliver' ? u.can_deliver : u.can_cook)))
      .filter(u => !q || [u.full_name, u.city, u.phone, u.email].some(v => v?.toLowerCase().includes(q)))
      .sort((a, b) => (a.role === b.role ? displayName(a).localeCompare(displayName(b), 'he') : a.role === 'admin' ? -1 : 1));
  }, [team, filter, search]);

  async function save(values: UserFormValues): Promise<boolean> {
    const target = editing === 'new' ? null : editing;
    // Her own row: never send e-mail / role (the server refuses a lock-out anyway).
    const body = target && isMe(target)
      ? { full_name: values.full_name, phone: values.phone, city: values.city, notes: values.notes, can_deliver: values.can_deliver, can_cook: values.can_cook }
      : values;
    const res = await authFetch(target ? `/api/admin/users/${target.id}` : '/api/admin/users', {
      method: target ? 'PATCH' : 'POST', body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) {
      toast.error(res ? await errorText(res, 'השמירה נכשלה') : 'אין חיבור לאינטרנט');
      return false;
    }
    toast.success(target ? 'הפרטים עודכנו'
      : values.email.trim() ? 'המתנדבת נוספה. היא יכולה להיכנס עם חשבון ה-Google שלה.' : 'המתנדבת נוספה לרשימה');
    await reload();
    return true;
  }

  async function toggleActive(u: AuthorizedUser) {
    const res = await authFetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH', body: JSON.stringify({ is_active: !u.is_active }),
    }).catch(() => null);
    if (!res?.ok) { toast.error(res ? await errorText(res, 'העדכון נכשל') : 'אין חיבור לאינטרנט'); return; }
    toast.success(u.is_active ? 'הושהתה – לא תופיע בשיבוצים ולא תיכנס למערכת' : 'הופעלה מחדש');
    await reload();
  }

  async function remove(u: AuthorizedUser) {
    const s = stats.get(u.id);
    const ok = await confirm({
      message: `למחוק את ${displayName(u)} מרשימת המתנדבות?${s && (s.deliveries || s.prep) ? ' השיבוצים הקרובים שלה יתבטלו.' : ''} אפשר במקום זה להשהות אותה.`,
    });
    if (!ok) return;
    const res = await authFetch(`/api/admin/users/${u.id}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) { toast.error(res ? await errorText(res, 'המחיקה נכשלה') : 'אין חיבור לאינטרנט'); return; }
    toast.success('נמחקה מהרשימה');
    await reload();
  }

  const counts: Record<Filter, number> = {
    all: team.filter(u => u.is_active).length,
    deliver: team.filter(u => u.is_active && u.can_deliver).length,
    cook: team.filter(u => u.is_active && u.can_cook).length,
    paused: team.filter(u => !u.is_active).length,
  };

  const actions = (u: AuthorizedUser) => (
    <span style={{ display: 'inline-flex', gap: 6 }}>
      <IconButton label="עריכה" icon="edit" onClick={() => setEditing(u)} />
      {!isMe(u) && <IconButton label={u.is_active ? 'השהיה' : 'הפעלה'} icon={u.is_active ? 'pause' : 'check'} onClick={() => toggleActive(u)} />}
      {!isMe(u) && <IconButton label="מחיקה" icon="trash" onClick={() => remove(u)} danger />}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero
        title="מתנדבות"
        subtitle="כל מי שעוזרת – מבשלות ומוסרות. מי שיש לה מייל יכולה גם להיכנס למערכת"
        action={
          <button onClick={() => setEditing('new')} style={buttonStyle('light')}>
            <Icon name="plus" size={18} />מתנדבת חדשה
          </button>
        }
      />

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div role="tablist" style={{
          display: 'flex', gap: 4, backgroundColor: C.card, padding: 5, borderRadius: 999,
          border: `1px solid ${C.border}`, boxShadow: C.shadow, maxWidth: '100%', overflowX: 'auto',
        }}>
          {FILTERS.map(f => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} style={{
              minHeight: 40, padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
              backgroundColor: filter === f.id ? C.accent : 'transparent', color: filter === f.id ? '#FFFFFF' : C.sub,
            }}>
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
        <input type="search" placeholder="חיפוש לפי שם, עיר או טלפון" value={search} aria-label="חיפוש"
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 220px', width: 'auto', borderRadius: 999, boxShadow: C.shadow }} />
      </div>

      {data.state === 'loading' && <StatusMessage title="טוען..." />}
      {data.state === 'error' && (
        <StatusMessage title={data.message}><button onClick={retry} style={buttonStyle('primary')}>נסי שוב</button></StatusMessage>
      )}
      {data.state === 'ready' && visible.length === 0 && (
        <StatusMessage title={search ? 'לא נמצאו תוצאות' : 'אין כאן מתנדבות'}
          text={search ? undefined : "לחצי על 'מתנדבת חדשה' כדי להוסיף."} />
      )}

      {visible.length > 0 && (
        <>
          {/* Desktop: a table */}
          <section className="only-desktop" style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr style={{ backgroundColor: C.tile, color: C.sub, fontSize: 13, textAlign: 'right' }}>
                  {['שם', 'טלפון', 'עיר', 'עושה', 'במערכת', 'משלוחים קרובים', 'הכנות פתוחות', 'נמסרו החודש', ''].map(h => (
                    <th key={h} style={{ padding: '12px 14px', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(u => {
                  const s = stats.get(u.id);
                  return (
                    <tr key={u.id} style={{ borderTop: `1px solid ${C.border}`, opacity: u.is_active ? 1 : 0.6 }}>
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{displayName(u)}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                          {u.role === 'admin' && <Badge tone="accent">{ROLE_LABELS.admin}</Badge>}
                          {isMe(u) && <Badge tone="plain">זו את</Badge>}
                          {!u.is_active && <Badge tone="muted">מושהית</Badge>}
                        </div>
                        {u.notes && <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{u.notes}</div>}
                      </td>
                      <td style={td}>{u.phone ? <a href={telLink(u.phone)} dir="ltr" style={{ color: C.text }}>{u.phone}</a> : '—'}</td>
                      <td style={td}>{u.city ?? '—'}</td>
                      <td style={td}>{tasksLabel(u) || '—'}</td>
                      <td style={td}>{u.email
                        ? <span title={u.email} style={{ color: C.success, fontWeight: 600 }}>✓ נכנסת</span>
                        : <span style={{ color: C.muted }}>ללא מייל</span>}</td>
                      <td style={tdNum}>{s?.deliveries ?? 0}</td>
                      <td style={tdNum}>{s?.prep ?? 0}</td>
                      <td style={tdNum}>{s?.doneThisMonth ?? 0}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{actions(u)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Phone: cards */}
          <div className="only-mobile">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visible.map(u => {
                const s = stats.get(u.id);
                return (
                  <article key={u.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10, opacity: u.is_active ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{displayName(u)}</div>
                        <div style={{ fontSize: 14, color: C.sub }}>
                          {[tasksLabel(u), u.city].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {u.role === 'admin' && <Badge tone="accent">{ROLE_LABELS.admin}</Badge>}
                        {!u.is_active && <Badge tone="muted">מושהית</Badge>}
                        <Badge tone={u.email ? 'ok' : 'muted'}>{u.email ? '✓ נכנסת' : 'ללא מייל'}</Badge>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                      <MiniStat value={s?.deliveries ?? 0} label="משלוחים קרובים" />
                      <MiniStat value={s?.prep ?? 0} label="הכנות פתוחות" />
                      <MiniStat value={s?.doneThisMonth ?? 0} label="נמסרו החודש" />
                    </div>
                    {u.notes && <div style={{ fontSize: 14, color: C.sub }}>{u.notes}</div>}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                      {u.phone && <a href={telLink(u.phone)} style={buttonStyle('secondary')}><Icon name="phone" size={17} />חיוג</a>}
                      <span style={{ marginInlineStart: 'auto' }}>{actions(u)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}

      <MailSettingsCard />

      {editing && (
        <UserForm
          user={editing === 'new' ? undefined : editing}
          lockAccess={editing !== 'new' && isMe(editing)}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

const td = { padding: '12px 14px', verticalAlign: 'top', color: C.text } as const;
const tdNum = { ...td, fontWeight: 800, fontSize: 17, textAlign: 'center' } as const;

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ backgroundColor: C.tile, borderRadius: 14, padding: '8px 6px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
    </div>
  );
}

function Badge({ tone, children }: { tone: 'accent' | 'plain' | 'muted' | 'ok'; children: React.ReactNode }) {
  const look = {
    accent: { bg: C.accentSub,  color: C.accent,  border: C.accentRim },
    plain:  { bg: C.tile,       color: C.sub,     border: C.border },
    muted:  { bg: '#F3F4F6',    color: C.muted,   border: '#E5E7EB' },
    ok:     { bg: C.successSub, color: C.success, border: '#BBF7D0' },
  }[tone];
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 999, whiteSpace: 'nowrap',
      backgroundColor: look.bg, color: look.color, border: `1px solid ${look.border}`,
    }}>
      {children}
    </span>
  );
}
