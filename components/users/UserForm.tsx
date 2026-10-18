'use client';

import { useState } from 'react';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import type { Role } from '@/lib/auth';
import { isEmail, type AuthorizedUser } from '@/lib/users';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

export interface UserFormValues {
  email: string;
  full_name: string;
  phone: string;
  city: string;
  notes: string;
  can_deliver: boolean;
  can_cook: boolean;
  role: Role;
}

/**
 * Add / edit a person, in a dialog.
 *   mode 'volunteer' — name, phone, city, what she does, notes. Volunteers
 *                      don't use the system: no e-mail, no role.
 *   mode 'manager'   — also the e-mail she signs in with (password login).
 * `lockAccess` = the manager's own row (her e-mail can't be changed here).
 */
export default function UserForm({ user, mode, lockAccess, onSubmit, onClose }: {
  user?: AuthorizedUser;
  mode: 'volunteer' | 'manager';
  lockAccess?: boolean;
  onSubmit: (values: UserFormValues) => Promise<boolean>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<UserFormValues>({
    email:       user?.email ?? '',
    full_name:   user?.full_name ?? '',
    phone:       user?.phone ?? '',
    city:        user?.city ?? '',
    notes:       user?.notes ?? '',
    can_deliver: user?.can_deliver ?? true,
    can_cook:    user?.can_cook ?? true,
    role:        user?.role ?? (mode === 'manager' ? 'admin' : 'volunteer'),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = (field: 'email' | 'full_name' | 'phone' | 'city' | 'notes') => ({
    value: values[field],
    onChange: (e: { target: { value: string } }) => setValues(old => ({ ...old, [field]: e.target.value })),
  });

  async function handleSubmit() {
    const email = values.email.trim();
    if (!values.full_name.trim() && !email) { setError('יש למלא שם'); return; }
    if (email && !isEmail(email)) { setError('כתובת המייל אינה תקינה'); return; }
    if (mode === 'manager' && !email) { setError('יש למלא את המייל שאיתו היא נכנסת למערכת'); return; }
    setError(null);
    setSaving(true);
    const ok = await onSubmit(values);
    setSaving(false);
    if (ok) onClose();
  }

  const row = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 } as const;
  const check = (field: 'can_deliver' | 'can_cook', label: string) => (
    <label style={{
      flex: '1 1 140px', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14,
      cursor: 'pointer', fontSize: 15, fontWeight: 600, color: C.text,
      backgroundColor: values[field] ? C.accentSub : C.tile, border: `1px solid ${values[field] ? C.accentRim : C.tile}`,
    }}>
      <input type="checkbox" checked={values[field]}
        onChange={e => setValues(old => ({ ...old, [field]: e.target.checked }))}
        style={{ width: 20, height: 20, accentColor: C.accent }} />
      {label}
    </label>
  );

  return (
    <Modal
      title={mode === 'manager' ? (user ? 'עריכת מנהלת' : 'מנהלת חדשה (גישה למערכת)') : (user ? 'עריכת מתנדבת' : 'מתנדבת חדשה')}
      busy={saving}
      onClose={onClose}
      onSubmit={handleSubmit}
      maxWidth={540}
      footer={<>
        <button type="submit" disabled={saving} style={buttonStyle('primary')}>{saving ? 'שומרת...' : 'שמירה'}</button>
        <button type="button" disabled={saving} onClick={onClose} style={buttonStyle('secondary')}>ביטול</button>
      </>}
    >
      <Field label="שם" required>
        <input {...text('full_name')} autoFocus maxLength={200} style={inputStyle} />
      </Field>
      <div style={row}>
        <Field label="טלפון">
          <input {...text('phone')} type="tel" dir="ltr" maxLength={30} style={{ ...inputStyle, textAlign: 'right' }} />
        </Field>
        <Field label="עיר / שכונה">
          <input {...text('city')} maxLength={100} style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.sub }}>במה היא עוזרת</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {check('can_deliver', 'מוסרת משלוחים')}
          {check('can_cook', 'מבשלת / מכינה')}
        </div>
      </div>

      {mode === 'manager' && (
        <Field label="מייל (איתו היא נכנסת)" required hint={lockAccess
          ? 'זה החשבון שאיתו את נכנסת – אי אפשר לשנות אותו מכאן'
          : 'מנהלת רואה ומנהלת הכול במערכת'}>
          <input {...text('email')} type="email" dir="ltr" disabled={lockAccess} maxLength={200}
            style={{ ...inputStyle, textAlign: 'left', opacity: lockAccess ? 0.7 : 1 }} />
        </Field>
      )}
      <Field label="הערות" hint="ימים שנוחים לה, מה היא אוהבת להכין, רכב וכו׳">
        <textarea {...text('notes')} rows={2} maxLength={1000} style={{ ...inputStyle, resize: 'vertical' }} />
      </Field>

      {error && <div role="alert" style={{ color: C.danger, fontSize: 14 }}>{error}</div>}
    </Modal>
  );
}
