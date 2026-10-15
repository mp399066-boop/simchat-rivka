'use client';

import { useEffect, useState } from 'react';
import { useFeedback } from '@/components/ui/Feedback';
import Modal from '@/components/ui/Modal';
import { relativeDay, hebrewDate } from '@/lib/dates';
import { sourceOf, type MenuItem } from '@/lib/menu';
import { loadMenu } from '@/lib/menuData';
import type { Mother } from '@/lib/mothers';
import { assignPrep, ensurePrepTasks, loadPrepFor, setPrepDone, type PrepTask } from '@/lib/prepData';
import { displayName, type AuthorizedUser } from '@/lib/users';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; items: MenuItem[]; tasks: PrepTask[] };

/** Load the menu, add any missing lines to this meal's checklist, then load it. */
async function fetchPrep(motherId: string): Promise<Load> {
  const menu = await loadMenu();
  if (menu.error !== null) return { state: 'error', message: menu.error };
  const ensured = await ensurePrepTasks(motherId, menu.data);
  if (ensured.error) return { state: 'error', message: ensured.error };
  const tasks = await loadPrepFor(motherId);
  if (tasks.error !== null) return { state: 'error', message: tasks.error };
  return { state: 'ready', items: menu.data, tasks: tasks.data };
}

/**
 * One meal's checklist: everything that goes into it, ✓ what is ready, and —
 * if someone is making it for her (a quiche, a dessert) — who.
 */
export default function PrepDialog({ mother, team, onClose }: {
  mother: Mother;
  team: AuthorizedUser[];
  onClose: () => void;   // the page reloads its counts on close
}) {
  const { toast } = useFeedback();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPrep(mother.id).then(s => { if (!cancelled) setLoad(s); });
    return () => { cancelled = true; };
  }, [mother.id]);

  const rows = load.state === 'ready'
    ? load.items
        .map(item => ({ item, task: load.tasks.find(t => t.menu_item_id === item.id) }))
        .filter((r): r is { item: MenuItem; task: PrepTask } => !!r.task && (r.item.is_active || r.task.done))
    : [];
  const done = rows.filter(r => r.task.done).length;
  // Who can be noted as making something: active people who cook (and whoever is noted already).
  const cooks = team.filter(u => u.is_active && (u.can_cook || rows.some(r => r.task.assignee_id === u.id)));

  /** Apply a change locally after it was saved. */
  const patch = (id: string, change: Partial<PrepTask>) => setLoad(l => l.state === 'ready'
    ? { ...l, tasks: l.tasks.map(t => (t.id === id ? { ...t, ...change } : t)) }
    : l);

  async function tick(task: PrepTask, value: boolean) {
    setBusy(true);
    const { error } = await setPrepDone(task.id, value);
    if (error) toast.error(error); else patch(task.id, { done: value });
    setBusy(false);
  }

  async function maker(task: PrepTask, personId: string | null) {
    setBusy(true);
    const { error } = await assignPrep([task.id], personId);
    if (error) toast.error(error); else patch(task.id, { assignee_id: personId });
    setBusy(false);
  }

  return (
    <Modal
      title={`מה מוכן לארוחה של ${mother.full_name}`}
      busy={busy}
      onClose={onClose}
      onSubmit={onClose}
      maxWidth={560}
      footer={<button type="submit" style={buttonStyle('primary')}>סגירה</button>}
    >
      {mother.delivery_date && (
        <div style={{ fontSize: 14, color: C.sub }}>
          משלוח {relativeDay(mother.delivery_date)} · {hebrewDate(mother.delivery_date)}
        </div>
      )}

      {load.state === 'loading' && <div style={{ color: C.sub }}>טוען...</div>}
      {load.state === 'error' && <div role="alert" style={{ color: C.danger }}>{load.message}</div>}

      {load.state === 'ready' && (
        <>
          <strong style={{ fontSize: 16, color: rows.length && done === rows.length ? C.success : C.text }}>
            {rows.length && done === rows.length ? 'הכול מוכן ✓' : `${done} מתוך ${rows.length} מוכנים`}
          </strong>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(({ item, task }) => {
              const src = sourceOf(item.source);
              return (
                <li key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  padding: '10px 12px', borderRadius: 16, backgroundColor: task.done ? C.successSub : C.tile,
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 180px', cursor: 'pointer', minWidth: 0 }}>
                    <input
                      type="checkbox" checked={task.done} disabled={busy}
                      onChange={e => tick(task, e.target.checked)}
                      style={{ width: 24, height: 24, accentColor: C.success, flexShrink: 0 }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: C.text }}>
                        {item.name} <span style={{ fontWeight: 500, color: C.sub }}>× {item.per_meal} {item.unit}</span>
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '1px 8px', borderRadius: 999, backgroundColor: src.bg, color: src.text }}>
                        {src.label}
                      </span>
                    </span>
                  </label>
                  {item.source !== 'buy' && (
                    <select
                      aria-label={`מי מכינה ${item.name}`}
                      value={task.assignee_id ?? ''}
                      disabled={busy}
                      onChange={e => maker(task, e.target.value || null)}
                      style={{ ...inputStyle, width: 'auto', minWidth: 140, flex: '0 1 190px', borderRadius: 999, fontSize: 15 }}
                    >
                      <option value="">מי מכינה? (לא חובה)</option>
                      {cooks.map(u => <option key={u.id} value={u.id}>{displayName(u)}</option>)}
                    </select>
                  )}
                </li>
              );
            })}
          </ul>
          {rows.length === 0 && <div style={{ color: C.muted }}>אין פריטים פעילים בתפריט</div>}
        </>
      )}
    </Modal>
  );
}
