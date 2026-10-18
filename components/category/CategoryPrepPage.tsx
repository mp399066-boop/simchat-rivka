'use client';

import { useEffect, useMemo, useState } from 'react';
import CategoryTabs from '@/components/category/CategoryTabs';
import Icon from '@/components/ui/Icon';
import PageHero from '@/components/ui/PageHero';
import StatusMessage from '@/components/ui/StatusMessage';
import KitchenDays from '@/components/prep/KitchenDays';
import PrepDialog from '@/components/prep/PrepDialog';
import { CATEGORY_INFO, inCategory, type Category } from '@/lib/categories';
import { hebrewDate, israelDate, relativeDay } from '@/lib/dates';
import type { MenuItem } from '@/lib/menu';
import { loadMenu } from '@/lib/menuData';
import { isOpen, type Mother } from '@/lib/mothers';
import { teamNames, useMothers } from '@/lib/useMothers';
import { buttonStyle, card, colors as C } from '@/lib/theme';

/** The manager's prep for one category: the kitchen sheet per day, and what is ready for each meal. */
export default function CategoryPrepPage({ category }: { category: Category }) {
  const info = CATEGORY_INFO[category];
  const { data, reload, retry } = useMothers(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [open, setOpen] = useState<Mother | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMenu(category).then(r => { if (!cancelled && r.data) setItems(r.data); });
    return () => { cancelled = true; };
  }, [category]);

  const mothers = useMemo(() => (data.state === 'ready' ? inCategory(data.mothers, category) : []), [data, category]);
  const names = useMemo(() => teamNames(data.state === 'ready' ? data.team : []), [data]);
  const meals = useMemo(() => mothers
    .filter(m => isOpen(m) && m.delivery_date)
    .sort((a, b) => (a.delivery_date ?? '').localeCompare(b.delivery_date ?? '')), [mothers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero title={`הכנות – ${info.label}`} subtitle="כמה צריך מכל דבר בכל יום, ומה כבר מוכן לכל ארוחה" />
      <CategoryTabs category={category} />
      {data.state === 'ready' && items.length > 0 && (
        <KitchenDays mothers={mothers} items={items} prep={data.prep} today={israelDate()} />
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
