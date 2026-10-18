'use client';

import { useState } from 'react';
import DateInput from '@/components/ui/DateInput';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { CATEGORY_INFO, type Category } from '@/lib/categories';
import { fullDate, nextDeliveryDay, noDeliveryReason, shiftDate } from '@/lib/dates';
import { DELIVERY_STATUSES, STATUS_LABELS, type Mother, type MotherInput } from '@/lib/mothers';
import { displayName, type AuthorizedUser } from '@/lib/users';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

type Values = Record<Exclude<keyof MotherInput, 'delivery_status' | 'category'>, string> & Pick<MotherInput, 'delivery_status'>;

/** How the delivery date is chosen: N days after the event (the category's presets), or by hand. */
type Plan = number | 'custom';

/** Delivery date for a plan: N days after the event, moved off שבת / יום טוב. */
function plannedDate(event: string, days: number) {
  const raw = shiftDate(event, days);
  const date = nextDeliveryDay(raw);
  return { date, movedFrom: date !== raw ? noDeliveryReason(raw) : null };
}

/** Which plan an existing delivery date matches (or 'custom'). */
function detectPlan(presets: number[], m?: Mother): Plan {
  if (!m?.delivery_date) return presets[0] ?? 'custom';
  const event = m.birth_date;
  if (!event) return 'custom';
  return presets.find(d => plannedDate(event, d).date === m.delivery_date) ?? 'custom';
}

const toValues = (m?: Mother): Values => ({
  full_name:             m?.full_name ?? '',
  occasion:              m?.occasion ?? '',
  phone:                 m?.phone ?? '',
  email:                 m?.email ?? '',
  address:               m?.address ?? '',
  city:                  m?.city ?? '',
  address_notes:         m?.address_notes ?? '',
  birth_date:            m?.birth_date ?? '',
  notes:                 m?.notes ?? '',
  delivery_date:         m?.delivery_date ?? '',
  delivery_status:       m?.delivery_status ?? 'planned',
  delivery_volunteer_id: m?.delivery_volunteer_id ?? '',
});

const digitsOf = (phone: string | null | undefined) => (phone ?? '').replace(/\D/g, '');

/** Add / edit a mother, a young couple or a simcha, and the delivery (manager only). */
export default function MotherForm({ category, mother, team, others, onSubmit, onClose }: {
  category: Category;
  mother?: Mother;
  team: AuthorizedUser[];
  /** Everyone listed — to warn about a phone number that is already listed. */
  others: Mother[];
  onSubmit: (input: MotherInput) => Promise<boolean>;
  onClose: () => void;
}) {
  const info = CATEGORY_INFO[category];
  const presets = info.plans.map(p => p.days);
  const [values, setValues] = useState<Values>(() => toValues(mother));
  const [plan, setPlan] = useState<Plan>(() => detectPlan(presets, mother));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bind = (field: keyof Values) => ({
    value: values[field],
    onChange: (e: { target: { value: string } }) => setValues(old => ({ ...old, [field]: e.target.value })),
  });

  // The delivery date that will be saved.
  const planned = plan !== 'custom' && values.birth_date ? plannedDate(values.birth_date, plan) : null;
  const deliveryDate = plan === 'custom' ? values.delivery_date : planned?.date ?? '';
  const customWarning = plan === 'custom' && values.delivery_date ? noDeliveryReason(values.delivery_date) : null;

  const setField = (field: keyof Values) => (v: string) => setValues(old => ({ ...old, [field]: v }));

  // Same phone already listed (someone else)?
  const phoneDigits = digitsOf(values.phone);
  const duplicate = phoneDigits.length >= 9
    ? others.find(o => o.id !== mother?.id && digitsOf(o.phone) === phoneDigits)
    : undefined;

  // Active people who deliver, plus the currently assigned one even if paused.
  const choices = team.filter(u => (u.is_active && u.can_deliver) || u.id === mother?.delivery_volunteer_id);

  async function handleSubmit() {
    if (!values.full_name.trim()) { setError(`יש למלא ${info.nameLabel}`); return; }
    const email = values.email.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('כתובת המייל אינה תקינה'); return; }
    setError(null);
    setSaving(true);
    const t = (s: string) => s.trim() || null;
    const ok = await onSubmit({
      category:              mother?.category ?? category,
      full_name:             values.full_name.trim(),
      occasion:              category === 'simcha' ? t(values.occasion) : mother?.occasion ?? null,
      phone:                 t(values.phone),
      email:                 email || null,
      address:               t(values.address),
      city:                  t(values.city),
      address_notes:         t(values.address_notes),
      birth_date:            values.birth_date || null,
      notes:                 t(values.notes),
      delivery_date:         deliveryDate || null,
      delivery_status:       values.delivery_status,
      delivery_volunteer_id: values.delivery_volunteer_id || null,
    });
    setSaving(false);
    if (ok) onClose();
  }

  const row = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 } as const;
  const planOptions: [Plan, string][] = [...info.plans.map(p => [p.days, p.label] as [Plan, string]), ['custom', 'תאריך אחר']];

  return (
    <Modal
      title={mother ? info.editLabel : info.newLabel}
      busy={saving}
      onClose={onClose}
      onSubmit={handleSubmit}
      maxWidth={580}
      footer={<>
        <button type="submit" disabled={saving} style={buttonStyle('primary')}>{saving ? 'שומרת...' : 'שמירה'}</button>
        <button type="button" disabled={saving} onClick={onClose} style={buttonStyle('secondary')}>ביטול</button>
      </>}
    >
      <Section title={info.details} />
      <Field label={info.nameLabel} required hint={info.nameHint}>
        <input {...bind('full_name')} autoFocus={!mother} maxLength={200} style={inputStyle} />
      </Field>
      {category === 'simcha' && (
        <Field label="איזו שמחה" hint="למשל: בר מצווה, ברית, אירוסין">
          <input {...bind('occasion')} maxLength={100} style={inputStyle} />
        </Field>
      )}
      <div style={row}>
        <Field label="טלפון">
          <input {...bind('phone')} type="tel" dir="ltr" maxLength={30} style={{ ...inputStyle, textAlign: 'right' }} />
        </Field>
      </div>
      <Field label="מייל" hint={`אם יש – יום לפני המשלוח תישלח ${info.plural ? 'אליהם' : 'אליה'} תזכורת עם כפתור אישור`}>
        <input {...bind('email')} type="email" dir="ltr" maxLength={200} style={{ ...inputStyle, textAlign: 'left' }} />
      </Field>
      {duplicate && (
        <div role="alert" style={{
          padding: '10px 14px', borderRadius: 14, fontSize: 14, fontWeight: 600,
          backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A',
        }}>
          שימי לב: הטלפון הזה כבר רשום אצל {duplicate.full_name}
        </div>
      )}
      <Field label={info.eventLabel}>
        <DateInput label={info.eventLabel} value={values.birth_date} onChange={setField('birth_date')} />
      </Field>
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
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, marginBottom: 8 }}>מתי המשלוח?</div>
        <div role="radiogroup" aria-label="מתי המשלוח" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {planOptions.map(([p, label]) => (
            <button
              key={String(p)} type="button" role="radio" aria-checked={plan === p} onClick={() => setPlan(p)}
              style={{
                ...buttonStyle(plan === p ? 'primary' : 'secondary'), fontSize: 14, padding: '8px 14px',
                boxShadow: 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{
          marginTop: 10, padding: '12px 14px', borderRadius: 14, fontSize: 15,
          backgroundColor: C.accentSub, color: C.deep, border: `1px solid ${C.accentRim}`,
        }}>
          {plan === 'custom' ? (
            <>
              <DateInput label="תאריך משלוח" value={values.delivery_date} onChange={setField('delivery_date')} />
              {!values.delivery_date && <div style={{ marginTop: 6 }}>אפשר להשאיר ריק עד שייקבע</div>}
              {customWarning && <div style={{ marginTop: 4, color: C.danger, fontWeight: 600 }}>שימי לב: זה {customWarning}</div>}
            </>
          ) : planned ? (
            <>
              <strong>{fullDate(planned.date)}</strong>
              {planned.movedFrom && <div style={{ fontSize: 13, marginTop: 4 }}>הוזז ליום הבא כי התאריך יצא ב{planned.movedFrom}</div>}
            </>
          ) : (
            <span>התאריך יחושב לבד אחרי שתמלאי את {info.eventLabel}</span>
          )}
        </div>
      </div>

      <div style={row}>
        <Field label="מי מוסרת" hint="המתנדבת תראה את המשלוח הזה במערכת שלה">
          <select {...bind('delivery_volunteer_id')} style={inputStyle}>
            <option value="">עוד לא שובצה</option>
            {choices.map(u => (
              <option key={u.id} value={u.id}>{displayName(u)}{u.is_active ? '' : ' (מושהית)'}</option>
            ))}
          </select>
        </Field>
        {mother && (
          <Field label="מצב">
            <select {...bind('delivery_status')} style={inputStyle}>
              {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
        )}
      </div>
      <Field label="הערות">
        <textarea {...bind('notes')} rows={3} maxLength={2000} style={{ ...inputStyle, resize: 'vertical' }} />
      </Field>

      {error && <div role="alert" style={{ color: C.danger, fontSize: 14 }}>{error}</div>}
    </Modal>
  );
}

function Section({ title }: { title: string }) {
  return <div style={{ fontSize: 16, fontWeight: 800, color: C.accent, marginTop: 4 }}>{title}</div>;
}
