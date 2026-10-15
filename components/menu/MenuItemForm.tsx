'use client';

import { useState } from 'react';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import type { MenuItem, MenuItemInput } from '@/lib/menu';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

/** Add / edit a menu item (manager only). */
export default function MenuItemForm({ item, onSubmit, onClose }: {
  item?: MenuItem;
  onSubmit: (input: MenuItemInput) => Promise<boolean>;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    name:      item?.name ?? '',
    details:   item?.details ?? '',
    unit:      item?.unit ?? 'יח׳',
    per_meal:  String(item?.per_meal ?? 1),
    stock:     String(item?.stock ?? 0),
    is_active: item?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bind = (field: 'name' | 'details' | 'unit' | 'per_meal' | 'stock') => ({
    value: values[field],
    onChange: (e: { target: { value: string } }) => setValues(old => ({ ...old, [field]: e.target.value })),
  });

  async function handleSubmit() {
    const perMeal = Number(values.per_meal);
    const stock = Number(values.stock);
    if (!values.name.trim()) { setError('יש למלא שם'); return; }
    if (!Number.isInteger(perMeal) || perMeal < 0) { setError('הכמות לארוחה צריכה להיות מספר שלם'); return; }
    if (!Number.isInteger(stock)) { setError('המלאי צריך להיות מספר שלם'); return; }
    setError(null);
    setSaving(true);
    const ok = await onSubmit({
      name: values.name.trim(),
      details: values.details.trim() || null,
      unit: values.unit.trim() || 'יח׳',
      per_meal: perMeal,
      stock,
      is_active: values.is_active,
    });
    setSaving(false);
    if (ok) onClose();
  }

  const row = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 } as const;

  return (
    <Modal
      title={item ? 'עריכת פריט' : 'פריט חדש בתפריט'}
      busy={saving}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<>
        <button type="submit" disabled={saving} style={buttonStyle('primary')}>{saving ? 'שומרת...' : 'שמירה'}</button>
        <button type="button" disabled={saving} onClick={onClose} style={buttonStyle('secondary')}>ביטול</button>
      </>}
    >
      <Field label="שם הפריט" required>
        <input {...bind('name')} autoFocus={!item} maxLength={100} placeholder="למשל: פשטידה" style={inputStyle} />
      </Field>
      <Field label="פירוט" hint="מה נכנס, הערות להכנה">
        <input {...bind('details')} maxLength={300} style={inputStyle} />
      </Field>
      <div style={row}>
        <Field label="כמה לכל ארוחה">
          <input {...bind('per_meal')} type="number" inputMode="numeric" min={0} step={1} style={inputStyle} />
        </Field>
        <Field label="יחידה" hint="יח׳, קופסה, כוס, סט">
          <input {...bind('unit')} maxLength={20} style={inputStyle} />
        </Field>
        <Field label="יש במלאי עכשיו">
          <input {...bind('stock')} type="number" inputMode="numeric" step={1} style={inputStyle} />
        </Field>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: C.text, cursor: 'pointer' }}>
        <input type="checkbox" checked={values.is_active}
          onChange={e => setValues(old => ({ ...old, is_active: e.target.checked }))}
          style={{ width: 20, height: 20, accentColor: C.accent }} />
        בשימוש בארוחות (כשהתיבה לא מסומנת, הפריט לא נספר ולא יורד מהמלאי)
      </label>

      {error && <div role="alert" style={{ color: C.danger, fontSize: 14 }}>{error}</div>}
    </Modal>
  );
}
