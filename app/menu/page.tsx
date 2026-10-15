'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFeedback } from '@/components/ui/Feedback';
import Icon from '@/components/ui/Icon';
import PageHero from '@/components/ui/PageHero';
import StatusMessage from '@/components/ui/StatusMessage';
import MenuItemCard from '@/components/menu/MenuItemCard';
import MenuItemForm from '@/components/menu/MenuItemForm';
import TodoList from '@/components/menu/TodoList';
import { fullDate, israelDate, shiftDate } from '@/lib/dates';
import { HORIZONS, mealsToPack, planItems, todoLists, type Horizon, type MenuItem, type MenuItemInput } from '@/lib/menu';
import { deleteMenuItem, loadMenu, saveMenuItem, setStock } from '@/lib/menuData';
import { useMothers } from '@/lib/useMothers';
import { buttonStyle, card, colors as C } from '@/lib/theme';

type MenuState = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; items: MenuItem[] };

async function fetchMenu(): Promise<MenuState> {
  const { data, error } = await loadMenu();
  return error !== null ? { state: 'error', message: error } : { state: 'ready', items: data };
}

/** The fixed menu, the stock, and what still has to be prepared (manager only). */
export default function MenuPage() {
  const { confirm, toast } = useFeedback();
  const { data: mothersData, reload: reloadMothers } = useMothers(true);
  const [menu, setMenu] = useState<MenuState>({ state: 'loading' });
  const [horizon, setHorizon] = useState<Horizon>('week');
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMenu().then(s => { if (!cancelled) setMenu(s); });
    return () => { cancelled = true; };
  }, []);
  const reload = useCallback(() => fetchMenu().then(setMenu), []);

  const items = useMemo(() => (menu.state === 'ready' ? menu.items : []), [menu]);
  const meals = useMemo(
    () => (mothersData.state === 'ready' ? mealsToPack(mothersData.mothers, horizon) : []),
    [mothersData, horizon],
  );
  const plans = useMemo(() => planItems(items, meals.length), [items, meals]);
  const lists = useMemo(
    () => todoLists(items, mothersData.state === 'ready' ? mothersData.mothers : [], horizon),
    [items, mothersData, horizon],
  );
  const todoEmpty = !lists.thaw.length && !lists.prepare.length && !lists.buy.length;
  const lastDay = shiftDate(israelDate(), (HORIZONS.find(h => h.id === horizon)?.days ?? 7) - 1);

  async function save(input: MenuItemInput): Promise<boolean> {
    const id = editing && editing !== 'new' ? editing.id : null;
    const nextOrder = Math.max(0, ...items.map(i => i.sort_order)) + 10;
    const { error } = await saveMenuItem(id, input, nextOrder);
    if (error) { toast.error(error); return false; }
    toast.success(id ? 'הפריט עודכן' : 'הפריט נוסף לתפריט');
    await reload();
    return true;
  }

  async function changeStock(item: MenuItem, stock: number) {
    setBusyId(item.id);
    const { error } = await setStock(item.id, stock);
    if (error) toast.error(error);
    else setMenu(m => m.state === 'ready'
      ? { ...m, items: m.items.map(i => (i.id === item.id ? { ...i, stock } : i)) }
      : m);
    setBusyId(null);
  }

  async function remove(item: MenuItem) {
    const ok = await confirm({
      message: `למחוק את "${item.name}" מהתפריט? אם הוא רק לא בשימוש כרגע, אפשר במקום זה לבטל את הסימון "בשימוש" בעריכה.`,
    });
    if (!ok) return;
    const { error } = await deleteMenuItem(item.id);
    if (error) { toast.error(error); return; }
    toast.success('הפריט נמחק');
    await reload();
  }

  const loading = menu.state === 'loading' || mothersData.state === 'loading';
  const error = menu.state === 'error' ? menu.message : mothersData.state === 'error' ? mothersData.message : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero
        title="תפריט ומלאי"
        subtitle="מה נכנס לכל ארוחה, מה כבר יש, ומה צריך להכין או לקנות"
        action={
          <button onClick={() => setEditing('new')} style={buttonStyle('light')}>
            <Icon name="plus" size={18} />פריט חדש
          </button>
        }
      />

      {loading && <StatusMessage title="טוען..." />}
      {error && (
        <StatusMessage title={error} text="כדאי לבדוק את החיבור לאינטרנט.">
          <button onClick={() => { setMenu({ state: 'loading' }); reload(); reloadMothers(); }} style={buttonStyle('primary')}>נסי שוב</button>
        </StatusMessage>
      )}

      {!loading && !error && (
        <>
          {/* Planning horizon */}
          <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>מה צריך להכין</h2>
              <div role="tablist" style={{ display: 'flex', gap: 4, backgroundColor: C.tile, padding: 4, borderRadius: 999, marginInlineStart: 'auto' }}>
                {HORIZONS.map(h => (
                  <button key={h.id} role="tab" aria-selected={horizon === h.id} onClick={() => setHorizon(h.id)} style={{
                    minHeight: 38, padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                    backgroundColor: horizon === h.id ? C.accent : 'transparent',
                    color: horizon === h.id ? '#FFFFFF' : C.sub,
                  }}>{h.label}</button>
                ))}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 16, color: C.text }}>
              <strong style={{ fontSize: 22, color: C.accent }}>{meals.length}</strong> ארוחות שעוד לא נארזו
              עד {fullDate(lastDay)}
            </p>
            {meals.length > 0 && (
              <p style={{ margin: 0, fontSize: 14, color: C.sub, lineHeight: 1.7 }}>
                {meals.map(m => m.full_name).join(' · ')}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
              כשמשלוח מסומן &quot;נארז&quot;, &quot;יצא&quot; או &quot;נמסר&quot;, הפריטים שלו יורדים מהמלאי לבד. בפריטים שמכינים טריים, סימון ✓ ב&quot;מה מוכן&quot; של ארוחה מוסיף ל&quot;כבר מוכן&quot;.
            </p>
          </section>

          {/* What to take out of the freezer, make and buy */}
          {items.length > 0 && (
            <TodoList
              lists={lists}
              until={`עד ${fullDate(lastDay)}`}
              action={!todoEmpty && (
                <button onClick={() => window.print()} style={{ ...buttonStyle('secondary'), backgroundColor: '#FFFFFF' }}>
                  הדפסה
                </button>
              )}
            />
          )}

          {items.length === 0 && (
            <StatusMessage title="התפריט ריק" text="לחצי על 'פריט חדש' כדי להוסיף את מה שנכנס לכל ארוחה." />
          )}

          <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 440px), 1fr))', gap: 16 }}>
            {plans.map(p => (
              <MenuItemCard
                key={p.item.id}
                plan={p}
                meals={meals.length}
                busy={busyId === p.item.id}
                onStock={n => changeStock(p.item, n)}
                onEdit={() => setEditing(p.item)}
                onDelete={() => remove(p.item)}
              />
            ))}
          </div>
        </>
      )}

      {editing && (
        <MenuItemForm item={editing === 'new' ? undefined : editing} onSubmit={save} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
