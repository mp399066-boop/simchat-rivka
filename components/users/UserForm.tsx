'use client';

import { useState } from 'react';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import type { Role } from '@/lib/auth';
import { isEmail, ROLE_LABELS, type AuthorizedUser } from '@/lib/users';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

export interface UserFormValues {
  email: string;
  full_name: string;
  phone: string;
  role: Role;
}

/**
 * Add / edit an authorized user, in a dialog. When editing, the e-mail is
 * fixed (it is the login identity) and the role can be locked (own account).
 */
export default function UserForm({ user, lockRole, onSubmit, onClose }: {
  user?: AuthorizedUser;
  lockRole?: boolean;
  onSubmit: (values: UserFormValues) => Promise<boolean>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<UserFormValues>({
    email:     user?.email ?? '',
    full_name: user?.full_name ?? '',
    phone:     user?.phone ?? '',
    role:      user?.role ?? 'volunteer',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof UserFormValues) => (v: string) => setValues(old => ({ ...old, [field]: v }));

  async function handleSubmit() {
    if (!user && !isEmail(values.email.trim())) { setError('יש להזין כתובת מייל תקינה'); return; }
    setError(null);
    setSaving(true);
    const ok = await onSubmit(values);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal
      title={user ? 'עריכת משתמשת' : 'הוספת משתמשת'}
      busy={saving}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<>
        <button type="submit" disabled={saving} style={buttonStyle('primary')}>
          {saving ? 'שומרת...' : 'שמירה'}
        </button>
        <button type="button" disabled={saving} onClick={onClose} style={buttonStyle('secondary')}>ביטול</button>
      </>}
    >
      <Field label="מייל (חשבון Google שאיתו היא נכנסת)" required={!user}>
        <input
          type="email" dir="ltr" autoFocus={!user} disabled={!!user}
          value={values.email} onChange={e => set('email')(e.target.value)}
          style={{ ...inputStyle, textAlign: 'left', opacity: user ? 0.7 : 1 }}
        />
      </Field>
      <Field label="שם">
        <input value={values.full_name} onChange={e => set('full_name')(e.target.value)}
          autoFocus={!!user} maxLength={200} style={inputStyle} />
      </Field>
      <Field label="טלפון">
        <input type="tel" dir="ltr" value={values.phone} onChange={e => set('phone')(e.target.value)}
          maxLength={30} style={{ ...inputStyle, textAlign: 'right' }} />
      </Field>
      <Field label="תפקיד">
        <select value={values.role} disabled={lockRole} onChange={e => set('role')(e.target.value)} style={inputStyle}>
          <option value="volunteer">{ROLE_LABELS.volunteer} – רואה רק את המשלוחים שלה</option>
          <option value="admin">{ROLE_LABELS.admin} – רואה ומנהלת הכול</option>
        </select>
      </Field>

      {error && <div role="alert" style={{ color: C.danger, fontSize: 14 }}>{error}</div>}
    </Modal>
  );
}
