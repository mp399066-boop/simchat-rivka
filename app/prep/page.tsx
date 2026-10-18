'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/components/layout/AppShell';
import { useFeedback } from '@/components/ui/Feedback';
import PageHero from '@/components/ui/PageHero';
import StatusMessage from '@/components/ui/StatusMessage';
import { hebrewDate, relativeDay } from '@/lib/dates';
import { loadMyPrep, setPrepDone, type MyPrepTask } from '@/lib/prepData';
import { buttonStyle, card, colors as C } from '@/lib/theme';

/**
 * A volunteer's own preparation tasks. The manager's prep lives inside each
 * category (/mothers/prep, /weddings/prep, /simchas/prep) — an old link to
 * /prep takes her to the mothers' one.
 */
export default function PrepPage() {
  const me = useMe();
  return me.role === 'admin' ? <ToCategoryPrep /> : <MyPrep />;
}

function ToCategoryPrep() {
  const router = useRouter();
  useEffect(() => { router.replace('/mothers/prep'); }, [router]);
  return <StatusMessage title="טוען..." />;
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
