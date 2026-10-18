'use client';

import type { ReactNode } from 'react';
import Icon from '@/components/ui/Icon';
import { sourceOf, type TodoLine, type TodoLists } from '@/lib/menu';
import { card, colors as C } from '@/lib/theme';

/**
 * What still has to be done for the coming meals, in three groups: take out
 * of the freezer, make, buy. Used on the home page and the menu page.
 */
export default function TodoList({ lists, until, label, action }: {
  lists: TodoLists;
  until: string;          // e.g. "לשבוע הקרוב"
  label?: string;         // the category, when the page shows several ("חתונות")
  action?: ReactNode;     // a button / link in the header
}) {
  const empty = !lists.thaw.length && !lists.prepare.length && !lists.buy.length;

  return (
    <section className="print-area" style={{
      ...card, display: 'flex', flexDirection: 'column', gap: 14,
      ...(empty ? { background: C.successSub, borderColor: '#BBF7D0' } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: empty ? C.success : C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name={empty ? 'check' : 'list'} size={20} />
          {empty ? `יש הכול ${until} ✓` : 'מה צריך עכשיו'}{label && ` – ${label}`}
        </h2>
        {action && <span className="no-print" style={{ marginInlineStart: 'auto' }}>{action}</span>}
      </div>

      {!empty && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 12 }}>
          <Group title="להוציא מהפריזר" hint="לארוחות של היום ומחר" tone="freezer" lines={lists.thaw} />
          <Group title="להכין" hint={until} tone="prepare" lines={lists.prepare} withVerb />
          <Group title="לקנות" hint={until} tone="buy" lines={lists.buy} />
        </div>
      )}
    </section>
  );
}

function Group({ title, hint, tone, lines, withVerb }: {
  title: string;
  hint: string;
  tone: 'freezer' | 'prepare' | 'buy';
  lines: TodoLine[];
  withVerb?: boolean;   // "להכין ולהקפיא" for freezer items in the make list
}) {
  const look = sourceOf(tone);
  return (
    <div style={{ borderRadius: 18, padding: '12px 14px', backgroundColor: lines.length ? look.bg : C.tile }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: lines.length ? 6 : 0 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: lines.length ? look.text : C.sub }}>{title}</h3>
        <span style={{ fontSize: 13, color: C.sub }}>{hint}</span>
      </div>
      {lines.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: C.muted }}>אין כלום ✓</p>
      ) : (
        <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 15, lineHeight: 1.9, color: C.text }}>
          {lines.map(({ item, amount }) => (
            <li key={item.id}>
              <strong>{item.name}</strong> – {amount} {item.unit}
              {withVerb && item.source === 'freezer' && (
                <span style={{ color: C.sub, fontSize: 13 }}> (להכין ולהקפיא)</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
