import Icon from '@/components/ui/Icon';
import { gregorianDate, hebrewDate, relativeDay, shiftDate } from '@/lib/dates';
import { sourceOf, type MenuItem } from '@/lib/menu';
import { isOpen, type Mother } from '@/lib/mothers';
import type { PrepTask } from '@/lib/prepData';
import { buttonStyle, card, colors as C } from '@/lib/theme';

/**
 * The kitchen sheet: for each of the coming days with meals — how many of
 * each item are needed that day, where it comes from, and how many are ready.
 */
export default function KitchenDays({ mothers, items, prep, today, days = 7 }: {
  mothers: Mother[];
  items: MenuItem[];
  prep: PrepTask[];
  today: string;
  days?: number;
}) {
  const last = shiftDate(today, days - 1);
  const active = items.filter(i => i.is_active);
  const byDay = new Map<string, Mother[]>();
  for (const m of mothers) {
    if (!isOpen(m) || !m.delivery_date || m.delivery_date < today || m.delivery_date > last) continue;
    byDay.set(m.delivery_date, [...(byDay.get(m.delivery_date) ?? []), m]);
  }
  const dates = [...byDay.keys()].sort();

  return (
    <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="chef" size={20} />דף מטבח – כמה מכל דבר לכל יום
        </h2>
        {dates.length > 0 && (
          <button className="no-print" onClick={() => window.print()} style={{ ...buttonStyle('secondary'), marginInlineStart: 'auto' }}>
            <Icon name="printer" size={17} />הדפסה
          </button>
        )}
      </div>

      {dates.length === 0 && <p style={{ margin: 0, color: C.muted }}>אין ארוחות בשבוע הקרוב</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 12 }}>
        {dates.map(date => {
          const meals = byDay.get(date)!;
          const ids = new Set(meals.map(m => m.id));
          return (
            <div key={date} style={{ borderRadius: 18, border: `1px solid ${C.border}`, padding: 14, backgroundColor: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <strong style={{ fontSize: 17, color: C.text }}>{relativeDay(date)}</strong>
                <span style={{ fontSize: 13, color: C.sub }}>{hebrewDate(date)} · {gregorianDate(date)}</span>
                <span style={{
                  marginInlineStart: 'auto', fontSize: 13, fontWeight: 800, padding: '2px 10px', borderRadius: 999,
                  backgroundColor: C.accentSub, color: C.accent,
                }}>{meals.length} ארוחות</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                <tbody>
                  {active.map(item => {
                    const total = item.per_meal * meals.length;
                    const ready = prep.filter(t => t.menu_item_id === item.id && t.done && ids.has(t.mother_id)).length;
                    const src = sourceOf(item.source);
                    return (
                      <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '7px 0', fontWeight: 700, color: C.text }}>{item.name}</td>
                        <td style={{ padding: '7px 6px', whiteSpace: 'nowrap', fontWeight: 800, color: C.accent }}>{total} {item.unit}</td>
                        <td style={{ padding: '7px 0', textAlign: 'left' }}>
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                            backgroundColor: src.bg, color: src.text,
                          }}>{src.label}</span>
                        </td>
                        <td style={{ padding: '7px 0', textAlign: 'left', whiteSpace: 'nowrap', fontSize: 13 }}>
                          <ItemState source={item.source} ready={ready} meals={meals.length} stock={item.stock} total={total} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 8 }}>
                ל: {meals.map(m => m.full_name).join(' · ')}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * How many of the day's meals have this item ready (✓ in "מה מוכן"); for
 * freezer / bought items also what is on hand now (red if not enough).
 */
function ItemState({ source, ready, meals, stock, total }: {
  source: MenuItem['source']; ready: number; meals: number; stock: number; total: number;
}) {
  const readyText = <span style={{ color: ready === meals ? C.success : C.sub }}>{ready === meals ? '✓ מוכן' : `מוכן ${ready}/${meals}`}</span>;
  if (source === 'prepare' || ready === meals) return readyText;
  const enough = stock >= total;
  return (
    <span>
      {readyText}
      <span style={{ color: enough ? C.success : C.danger }}> · {source === 'freezer' ? 'בפריזר' : 'יש'} {Math.max(0, stock)}</span>
    </span>
  );
}
