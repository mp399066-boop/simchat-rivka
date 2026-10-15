'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMe } from '@/components/layout/AppShell';
import { useFeedback } from '@/components/ui/Feedback';
import Icon from '@/components/ui/Icon';
import PageHero from '@/components/ui/PageHero';
import StatusMessage from '@/components/ui/StatusMessage';
import KitchenDays from '@/components/prep/KitchenDays';
import PrepDialog from '@/components/prep/PrepDialog';
import { hebrewDate, israelDate, relativeDay } from '@/lib/dates';
import type { MenuItem } from '@/lib/menu';
import { loadMenu } from '@/lib/menuData';
import { isOpen, type Mother } from '@/lib/mothers';
import { loadMyPrep, setPrepDone, type MyPrepTask } from '@/lib/prepData';
import { teamNames, useMothers } from '@/lib/useMothers';
import { buttonStyle, card, colors as C } from '@/lib/theme';

/** Preparation: a volunteer's own tasks, or — for the manager — every upcoming meal. */
export default function PrepPage() {
  const me = useMe();
  return me.role === 'admin' ? <AllPrep /> : <MyPrep />;
}

/* ── Volunteer: my tasks ─────────────────────────────────────────────────── */

type MyLoad = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; tasks: MyPrepTask[] };

async function fetchMine(): Promise<MyLoad> {
  const { data, error } = await loadMyPrep();
  return error !== null ? { state: 'error', message: error } : { state: 'ready', tasks: data };
}

function MyPrep() {
  const { toast } = useFeedback();
  const [load, setLoad] = useState<MyLoad>({ state: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMine().then(s => { if (!cancelled) setLoad(s); });
    return () => { cancelled = true; };
  }, []);
  const retry = useCallback(() => { setLoad({ state: 'loading' }); fetchMine().then(setLoad); }, []);

  async function tick(t: MyPrepTask, done: boolean) {
    setBusyId(t.task_id);
    const { error } = await setPrepDone(t.task_id, done);
    if (error) toast.error(error);
    else setLoad(l => l.state === 'ready'
      ? { ...l, tasks: l.tasks.map(x => (x.task_id === t.task_id ? { ...x, done } : x)) } : l);
    setBusyId(null);
  }

  // Grouped by delivery date (no date last).
  const groups = useMemo(() => {
    const map = new Map<string, MyPrepTask[]>();
    for (const t of load.state === 'ready' ? load.tasks : []) {
      const k = t.delivery_date ?? '';
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return [...map.entries()].sort(([a], [b]) => (a || '9999').localeCompare(b || '9999'));
  }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero title="ההכנות שלי" subtitle="מה את מכינה לארוחות הקרובות. סמני ✓ כשמשהו מוכן" />
      {load.state === 'loading' && <StatusMessage title="טוען..." />}
      {load.state === 'error' && (
        <StatusMessage title={load.message}><button onClick={retry} style={buttonStyle('primary')}>נסי שוב</button></StatusMessage>
      )}
      {load.state === 'ready' && load.tasks.length === 0 && (
        <StatusMessage title="אין לך הכנות כרגע" text="כשהמנהלת תשבץ אותך להכין משהו, זה יופיע כאן." />
      )}
      {groups.map(([date, tasks]) => (
        <section key={date || 'none'} style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 10px' }}>
            {date ? `${relativeDay(date)} · ${hebrewDate(date)}` : 'בלי תאריך משלוח'}
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map(t => (
              <li key={t.task_id}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, cursor: 'pointer',
                  backgroundColor: t.done ? C.successSub : C.tile,
                }}>
                  <input type="checkbox" checked={t.done} disabled={busyId === t.task_id}
                    onChange={e => tick(t, e.target.checked)}
                    style={{ width: 24, height: 24, accentColor: C.success, flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 17, fontWeight: 700, color: C.text, textDecoration: t.done ? 'line-through' : 'none' }}>
                      {t.item_name} × {t.per_meal} {t.unit}
                    </span>
                    <span style={{ fontSize: 14, color: C.sub }}>לארוחה של {t.mother_name}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ── Manager: every upcoming meal ────────────────────────────────────────── */

function AllPrep() {
  const { data, reload, retry } = useMothers(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [open, setOpen] = useState<Mother | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMenu().then(r => { if (!cancelled && r.data) setItems(r.data); });
    return () => { cancelled = true; };
  }, []);

  const names = useMemo(() => teamNames(data.state === 'ready' ? data.team : []), [data]);
  const meals = useMemo(() => (data.state === 'ready'
    ? data.mothers.filter(m => isOpen(m) && m.delivery_date)
        .sort((a, b) => (a.delivery_date ?? '').localeCompare(b.delivery_date ?? ''))
    : []), [data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero title="הכנות" subtitle="כמה צריך מכל דבר בכל יום, ומה כבר מוכן לכל ארוחה" />
      {data.state === 'ready' && items.length > 0 && (
        <KitchenDays mothers={data.mothers} items={items} prep={data.prep} today={israelDate()} />
      )}
      {data.state === 'loading' && <StatusMessage title="טוען..." />}
      {data.state === 'error' && (
        <StatusMessage title={data.message}><button onClick={retry} style={buttonStyle('primary')}>נסי שוב</button></StatusMessage>
      )}
      {data.state === 'ready' && meals.length === 0 && (
        <StatusMessage title="אין ארוחות קרובות" text="ארוחות עם תאריך משלוח יופיעו כאן." />
      )}
      {meals.length > 0 && <h2 className="no-print" style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '4px 0 0' }}>מה מוכן לכל ארוחה</h2>}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 440px), 1fr))', gap: 16 }}>
        {data.state === 'ready' && meals.map(m => {
          const tasks = data.prep.filter(t => t.mother_id === m.id);
          const done = tasks.filter(t => t.done).length;
          return (
            <article key={m.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>{m.full_name}</h3>
                  <div style={{ fontSize: 14, color: C.sub }}>
                    {m.delivery_date && `${relativeDay(m.delivery_date)} · ${hebrewDate(m.delivery_date)}`}
                  </div>
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 800, padding: '5px 12px', borderRadius: 999,
                  backgroundColor: tasks.length && done === tasks.length ? '#DCFCE7' : C.accentSub,
                  color: tasks.length && done === tasks.length ? '#166534' : C.accent,
                }}>
                  {tasks.length ? `${done}/${tasks.length} מוכנים` : 'עוד לא סומן'}
                </span>
              </div>
              {tasks.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 15 }}>
                  {tasks.map(t => {
                    const item = items.find(i => i.id === t.menu_item_id);
                    return (
                      <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: t.done ? C.success : C.text }}>
                        <span>{t.done ? '✓ ' : ''}{item?.name ?? ''}</span>
                        <span style={{ color: C.sub }}>
                          {t.assignee_id ? names.get(t.assignee_id) ?? '' : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button onClick={() => setOpen(m)} style={{ ...buttonStyle('secondary'), alignSelf: 'flex-start' }}>
                <Icon name="check" size={17} />מה מוכן
              </button>
            </article>
          );
        })}
      </div>
      {open && data.state === 'ready' && (
        <PrepDialog mother={open} team={data.team} onClose={() => { setOpen(null); reload(); }} />
      )}
    </div>
  );
}
