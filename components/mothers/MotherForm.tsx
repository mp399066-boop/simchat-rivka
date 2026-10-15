'use client';

import { useState } from 'react';
import DateInput from '@/components/ui/DateInput';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { fullDate, nextDeliveryDay, noDeliveryReason, shiftDate } from '@/lib/dates';
import { DELIVERY_STATUSES, STATUS_LABELS, type Mother, type MotherInput } from '@/lib/mothers';
import type { AuthorizedUser } from '@/lib/users';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

type Values = Record<Exclude<keyof MotherInput, 'delivery_status'>, string> & Pick<MotherInput, 'delivery_status'>;

/** How the delivery date is chosen: a week / two weeks after the birth, or by hand. */
type Plan = 'week' | 'twoWeeks' | 'custom';
const PLAN_DAYS: Record<Exclude<Plan, 'custom'>, number> = { week: 7, twoWeeks: 14 };

/** Delivery date for a plan: N days after the birth, moved off שבת / יום טוב. */
function plannedDate(birth: string, plan: Exclude<Plan, 'custom'>) {
  const raw = shiftDate(birth, PLAN_DAYS[plan]);
  const date = nextDeliveryDay(raw);
  return { date, movedFrom: date !== raw ? noDeliveryReason(raw) : null };
}

/** Which plan an existing delivery date matches (or 'custom'). */
function detectPlan(m?: Mother): Plan {
  if (!m?.delivery_date) return 'week';
  if (m.birth_date) {
    if (plannedDate(m.birth_date, 'week').date === m.delivery_date) return 'week';
    if (plannedDate(m.birth_date, 'twoWeeks').date === m.delivery_date) return 'twoWeeks';
  }
  return 'custom';
}

const toValues = (m?: Mother): Values => ({
  full_name:             m?.full_name ?? '',
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

/** Add / edit a mother and her delivery (manager only). */
export default function MotherForm({ mother, team, others, onSubmit, onClose }: {
  mother?: Mother;
  team: AuthorizedUser[];
  /** All mothers — to warn about a phone number that is already listed. */
  others: Mother[];
  onSubmit: (input: MotherInput) => Promise<boolean>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Values>(() => toValues(mother));
  const [plan, setPlan] = useState<Plan>(() => detectPlan(mother));
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

  // Same phone already listed (another mother)?
  const phoneDigits = values.phone.replace(/D/g, '');
  const duplicate = phoneDigits.length >= 9
    ? others.find(o => o.id !== mother?.id && o.phone?.replace(/D/g, '') === phoneDigits)
    : undefined;

  // Active users, plus the currently assigned one even if she was paused.
  const choices = team.filter(u => u.is_active || u.id === mother?.delivery_volunteer_id);

  async function handleSubmit() {
    if (!values.full_name.trim()) { setError('יש למלא את שם היולדת'); return; }
    const email = values.email.trim().toLowerCase();
    if (email && !/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) { setError('כתובת המייל אינה תקינה'); return; }
    setError(null);
    setSaving(true);
    const t = (s: string) => s.trim() || null;
    const ok = await onSubmit({
      full_name:             values.full_name.trim(),
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

  return (
    <Modal
      title={mother ? 'עריכת יולדת' : 'יולדת חדשה'}
      busy={saving}
      onClose={onClose}
      onSubmit={handleSubmit}
      maxWidth={580}
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
      </div>
      <Field label="מייל" hint="אם יש – יום לפני המשלוח תישלח אליה תזכורת עם כפתור אישור">
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
      <Field label="תאריך לידה">
        <DateInput label="תאריך לידה" value={values.birth_date} onChange={setField('birth_date')} />
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
          {([['week', 'שבוע אחרי הלידה'], ['twoWeeks', 'שבועיים אחרי הלידה'], ['custom', 'תאריך אחר']] as const).map(([p, label]) => (
            <button
              key={p} type="button" role="radio" aria-checked={plan === p} onClick={() => setPlan(p)}
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
            <span>התאריך יחושב לבד אחרי שתמלאי את תאריך הלידה</span>
          )}
        </div>
      </div>

      <div style={row}>
        <Field label="מי מוסרת" hint="המתנדבת תראה את היולדת הזו במערכת שלה">
          <select {...bind('delivery_volunteer_id')} style={inputStyle}>
            <option value="">עוד לא שובצה</option>
            {choices.map(u => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}{u.is_active ? '' : ' (מושהית)'}</option>
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
