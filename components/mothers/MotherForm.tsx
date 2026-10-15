'use client';

import { useState } from 'react';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { DELIVERY_STATUSES, STATUS_LABELS, type Mother, type MotherInput } from '@/lib/mothers';
import type { AuthorizedUser } from '@/lib/users';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

type Values = Record<Exclude<keyof MotherInput, 'delivery_status'>, string> & Pick<MotherInput, 'delivery_status'>;

const toValues = (m?: Mother): Values => ({
  full_name:             m?.full_name ?? '',
  phone:                 m?.phone ?? '',
  address:               m?.address ?? '',
  city:                  m?.city ?? '',
  address_notes:         m?.address_notes ?? '',
  birth_date:            m?.birth_date ?? '',
  notes:                 m?.notes ?? '',
  delivery_date:         m?.delivery_date ?? '',
  delivery_status:       m?.delivery_status ?? 'planned',
  delivery_volunteer_id: m?.delivery_volunteer_id ?? '',
});

/** Empty strings become null; text is trimmed. */
const toInput = (v: Values): MotherInput => {
  const t = (s: string) => s.trim() || null;
  return {
    full_name:             v.full_name.trim(),
    phone:                 t(v.phone),
    address:               t(v.address),
    city:                  t(v.city),
    address_notes:         t(v.address_notes),
    birth_date:            v.birth_date || null,
    notes:                 t(v.notes),
    delivery_date:         v.delivery_date || null,
    delivery_status:       v.delivery_status,
    delivery_volunteer_id: v.delivery_volunteer_id || null,
  };
};

/** Add / edit a mother and her delivery (manager only). */
export default function MotherForm({ mother, team, onSubmit, onClose }: {
  mother?: Mother;
  team: AuthorizedUser[];
  onSubmit: (input: MotherInput) => Promise<boolean>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Values>(() => toValues(mother));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bind = (field: keyof Values) => ({
    value: values[field],
    onChange: (e: { target: { value: string } }) => setValues(old => ({ ...old, [field]: e.target.value })),
  });

  // Active users, plus the currently assigned one even if she was paused.
  const choices = team.filter(u => u.is_active || u.id === mother?.delivery_volunteer_id);

  async function handleSubmit() {
    if (!values.full_name.trim()) { setError('יש למלא את שם היולדת'); return; }
    setError(null);
    setSaving(true);
    const ok = await onSubmit(toInput(values));
    setSaving(false);
    if (ok) onClose();
  }

  const row = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 } as const;

  return (
    <Modal
      title={mother ? 'עריכת יולדת' : 'יולדת חדשה'}
      busy={saving}
      onClose={onClose}
      onSubmit={handleSubmit}
      maxWidth={560}
      footer={<>
        <button type="submit" disabled={saving} style={buttonStyle('primary')}>{saving ? 'שומרת...' : 'שמירה'}</button>
        <button type="button" disabled={saving} onClick={onClose} style={buttonStyle('secondary')}>ביטול</button>
      </>}
    >
      <Section title="פרטי היולדת" />
      <Field label="שם מלא" required>
        <input {...bind('full_name')} autoFocus={!mother} maxLength={200} style={inputStyle} />
      </Field>
      <div style={row}>
        <Field label="טלפון">
          <input {...bind('phone')} type="tel" dir="ltr" maxLength={30} style={{ ...inputStyle, textAlign: 'right' }} />
        </Field>
        <Field label="תאריך לידה">
          <input {...bind('birth_date')} type="date" style={inputStyle} />
        </Field>
      </div>
      <div style={row}>
        <Field label="רחוב ומספר">
          <input {...bind('address')} maxLength={200} style={inputStyle} />
        </Field>
        <Field label="עיר">
          <input {...bind('city')} maxLength={100} style={inputStyle} />
        </Field>
      </div>
      <Field label="הערות לכתובת" hint="קומה, דירה, קוד כניסה, איך להגיע">
        <input {...bind('address_notes')} maxLength={300} style={inputStyle} />
      </Field>

      <Section title="המשלוח" />
      <div style={row}>
        <Field label="תאריך משלוח" hint="אפשר להשאיר ריק עד שייקבע">
          <input {...bind('delivery_date')} type="date" style={inputStyle} />
        </Field>
        {mother && (
          <Field label="מצב">
            <select {...bind('delivery_status')} style={inputStyle}>
              {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
        )}
      </div>
      <Field label="מי מוסרת" hint="המתנדבת תראה את היולדת הזו במערכת שלה">
        <select {...bind('delivery_volunteer_id')} style={inputStyle}>
          <option value="">עוד לא שובצה</option>
          {choices.map(u => (
            <option key={u.id} value={u.id}>{u.full_name || u.email}{u.is_active ? '' : ' (מושהית)'}</option>
          ))}
        </select>
      </Field>
      <Field label="הערות">
        <textarea {...bind('notes')} rows={3} maxLength={2000} style={{ ...inputStyle, resize: 'vertical' }} />
      </Field>

      {error && <div role="alert" style={{ color: C.danger, fontSize: 14 }}>{error}</div>}
    </Modal>
  );
}

function Section({ title }: { title: string }) {
  return <div style={{ fontSize: 15, fontWeight: 700, color: C.accent, marginTop: 4 }}>{title}</div>;
}
