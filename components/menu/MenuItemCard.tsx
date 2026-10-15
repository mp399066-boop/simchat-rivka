'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import IconButton from '@/components/ui/IconButton';
import { sourceOf, type ItemPlan, type ItemSource } from '@/lib/menu';
import { card, colors as C, tile } from '@/lib/theme';

/** The question above the stock field, by where the item comes from. */
const STOCK_QUESTION: Record<ItemSource, string> = {
  freezer: 'כמה יש עכשיו בפריזר?',
  prepare: 'כמה כבר מוכן?',
  buy: 'כמה כבר קנינו (יש בבית)?',
};
const STOCK_LABEL: Record<ItemSource, string> = { freezer: 'יש בפריזר', prepare: 'כבר מוכן', buy: 'יש בבית' };

/**
 * One menu item: how many per meal, how many are needed for the coming meals,
 * what is on hand, what is missing — with quick stock buttons.
 */
export default function MenuItemCard({ plan, meals, busy, onStock, onEdit, onDelete }: {
  plan: ItemPlan;
  meals: number;
  busy?: boolean;
  onStock: (stock: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { item, needed, missing, ready } = plan;
  const source = sourceOf(item.source);
  // Typed amount, kept while the field is being edited; null = show the saved stock.
  const [draft, setDraft] = useState<string | null>(null);

  function commitDraft() {
    if (draft === null) return;
    const n = Number(draft);
    setDraft(null);
    if (draft.trim() !== '' && Number.isInteger(n) && n !== item.stock) onStock(n);
  }

  return (
    <article style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14, opacity: item.is_active ? 1 : 0.6 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{
          width: 50, height: 50, borderRadius: 16, flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: C.accentSub, color: C.accent,
        }}>
          <Icon name="sparkle" size={24} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 19, fontWeight: 800, color: C.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {item.name}
            <span style={{
              fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
              backgroundColor: source.bg, color: source.text, whiteSpace: 'nowrap',
            }}>{source.label}</span>
          </h3>
          {item.details && <div style={{ fontSize: 14, color: C.sub, marginTop: 2 }}>{item.details}</div>}
          {!item.is_active && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>לא בשימוש כרגע</div>}
        </div>
        <span style={{
          fontSize: 14, fontWeight: 800, padding: '6px 12px', borderRadius: 999, flexShrink: 0,
          backgroundColor: C.accentSub, color: C.accent, whiteSpace: 'nowrap',
        }}>
          {item.per_meal} {item.unit} לארוחה
        </span>
      </div>

      {/* Progress: stock vs. need */}
      {item.is_active && needed > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.sub, marginBottom: 6 }}>
            <span>יש {Math.max(0, item.stock)} מתוך {needed} שצריך</span>
            <span style={{ fontWeight: 700 }}>{Math.round(ready * 100)}%</span>
          </div>
          <div style={{ height: 10, borderRadius: 999, backgroundColor: C.tile, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${ready * 100}%`, borderRadius: 999,
              background: missing ? 'linear-gradient(90deg, #F2A93B, #C8155B)' : '#16A34A',
            }} />
          </div>
        </div>
      )}

      {/* Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <Tile value={needed} label={`צריך ל-${meals} ארוחות`} />
        <Tile value={item.stock} label={STOCK_LABEL[item.source]} warn={item.stock < 0} />
        <Tile value={missing} label="חסר" warn={missing > 0} good={item.is_active && needed > 0 && !missing} />
      </div>

      {/* Stock controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        paddingTop: 12, borderTop: `1px solid ${C.border}`,
      }}>
        <span style={{ display: 'flex', flexDirection: 'column', flexBasis: '100%' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{STOCK_QUESTION[item.source]}</span>
          <span style={{ fontSize: 13, color: C.muted }}>הקלידי את המספר, או לחצי + כשנוסף ו־− כשהוצא</span>
        </span>
        <RoundButton label="הפחתה של אחד" disabled={busy} onClick={() => onStock(item.stock - 1)}>−</RoundButton>
        <input
          aria-label={`מלאי ${item.name}`} type="number" inputMode="numeric" step={1} disabled={busy}
          value={draft ?? String(item.stock)}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitDraft(); } }}
          style={{
            width: 76, minHeight: 44, textAlign: 'center', borderRadius: 999, fontSize: 17, fontWeight: 800,
            border: `1px solid ${C.border}`, fontFamily: 'inherit', color: C.text,
          }}
        />
        <RoundButton label="הוספה של אחד" disabled={busy} onClick={() => onStock(item.stock + 1)}>+</RoundButton>
        <span style={{ fontSize: 14, color: C.sub }}>{item.unit}</span>
        <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
          <IconButton label="עריכה" icon="edit" onClick={onEdit} />
          <IconButton label="מחיקה" icon="trash" onClick={onDelete} danger />
        </span>
      </div>
    </article>
  );
}

function Tile({ value, label, warn, good }: { value: number; label: string; warn?: boolean; good?: boolean }) {
  return (
    <div style={{ ...tile, backgroundColor: warn ? '#FEF2F2' : good ? '#F0FDF4' : C.tile }}>
      <span style={{ fontSize: 22, fontWeight: 800, color: warn ? C.danger : good ? C.success : C.text }}>{value}</span>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
    </div>
  );
}

function RoundButton({ label, disabled, onClick, children }: {
  label: string; disabled?: boolean; onClick: () => void; children: string;
}) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} style={{
      width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      backgroundColor: C.accentSub, color: C.accent, fontSize: 22, fontWeight: 800, lineHeight: 1,
    }}>
      {children}
    </button>
  );
}
