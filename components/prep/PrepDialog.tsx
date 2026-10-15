'use client';

import { useEffect, useState } from 'react';
import { useFeedback } from '@/components/ui/Feedback';
import Modal from '@/components/ui/Modal';
import { relativeDay, hebrewDate } from '@/lib/dates';
import type { MenuItem } from '@/lib/menu';
import { loadMenu } from '@/lib/menuData';
import type { Mother } from '@/lib/mothers';
import { assignPrep, ensurePrepTasks, loadPrepFor, setPrepDone, type PrepTask } from '@/lib/prepData';
import { displayName, type AuthorizedUser } from '@/lib/users';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; items: MenuItem[]; tasks: PrepTask[] };

/** Load the menu, create any missing tasks for this meal, then load them. */
async function fetchPrep(motherId: string): Promise<Load> {
  const menu = await loadMenu();
  if (menu.error !== null) return { state: 'error', message: menu.error };
  const ensured = await ensurePrepTasks(motherId, menu.data);
  if (ensured.error) return { state: 'error', message: ensured.error };
  const tasks = await loadPrepFor(motherId);
  if (tasks.error !== null) return { state: 'error', message: tasks.error };
  return { state: 'ready', items: menu.data, tasks: tasks.data };
}

/** Who prepares what for one meal, and what is done (manager). */
export default function PrepDialog({ mother, team, onClose }: {
  mother: Mother;
  team: AuthorizedUser[];
  onClose: () => void;   // the page reloads its progress counts on close
}) {
  const { toast } = useFeedback();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPrep(mother.id).then(s => { if (!cancelled) setLoad(s); });
    return () => { cancelled = true; };
  }, [mother.id]);

  // Active people who cook (plus whoever is already assigned here).
  const people = team.filter(u => u.is_active && (u.can_cook || load.state === 'ready' && load.tasks.some(t => t.assignee_id === u.id)));
  const rows = load.state === 'ready'
    ? load.items
        .map(item => ({ item, task: load.tasks.find(t => t.menu_item_id === item.id) }))
        .filter((r): r is { item: MenuItem; task: PrepTask } => !!r.task && (r.item.is_active || r.task.done || !!r.task.assignee_id))
    : [];
  const done = rows.filter(r => r.task.done).length;

  /** Apply a change locally after it was saved. */
  const patch = (ids: string[], change: Partial<PrepTask>) => setLoad(l => l.state === 'ready'
    ? { ...l, tasks: l.tasks.map(t => (ids.includes(t.id) ? { ...t, ...change } : t)) }
    : l);

  async function assign(ids: string[], assigneeId: string | null) {
    if (!ids.length) return;
    setBusy(true);
    const { error } = await assignPrep(ids, assigneeId);
    if (error) toast.error(error); else patch(ids, { assignee_id: assigneeId });
    setBusy(false);
  }

  async function tick(task: PrepTask, value: boolean) {
    setBusy(true);
    const { error } = await setPrepDone(task.id, value);
    if (error) toast.error(error); else patch([task.id], { done: value });
    setBusy(false);
  }

  return (
    <Modal
      title={`הכנות – ${mother.full_name}`}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 16, color: done === rows.length && rows.length ? C.success : C.text }}>
              {done} מתוך {rows.length} מוכנים
            </strong>
            <select
              aria-label="שיבוץ כל ההכנות"
              value=""
              disabled={busy}
              onChange={e => assign(rows.map(r => r.task.id), e.target.value || null)}
              style={{ ...inputStyle, width: 'auto', minWidth: 190, marginInlineStart: 'auto', borderRadius: 999 }}
            >
              <option value="">שיבוץ הכול ל...</option>
              {people.map(u => <option key={u.id} value={u.id}>{displayName(u)}</option>)}
            </select>
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(({ item, task }) => (
              <li key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                padding: '10px 12px', borderRadius: 16, backgroundColor: task.done ? C.successSub : C.tile,
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 180px', cursor: 'pointer', minWidth: 0 }}>
                  <input
                    type="checkbox" checked={task.done} disabled={busy}
                    onChange={e => tick(task, e.target.checked)}
                    style={{ width: 22, height: 22, accentColor: C.success, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.text, textDecoration: task.done ? 'line-through' : 'none' }}>
                    {item.name}
                    <span style={{ fontWeight: 500, color: C.sub }}> × {item.per_meal} {item.unit}</span>
                  </span>
                </label>
                <select
                  aria-label={`מי מכינה ${item.name}`}
                  value={task.assignee_id ?? ''}
                  disabled={busy}
                  onChange={e => assign([task.id], e.target.value || null)}
                  style={{ ...inputStyle, width: 'auto', minWidth: 150, flex: '0 1 200px', borderRadius: 999 }}
                >
                  <option value="">לא שובץ</option>
                  {people.map(u => <option key={u.id} value={u.id}>{displayName(u)}</option>)}
                </select>
              </li>
            ))}
          </ul>
          {rows.length === 0 && <div style={{ color: C.muted }}>אין פריטים פעילים בתפריט</div>}
        </>
      )}
    </Modal>
  );
}
