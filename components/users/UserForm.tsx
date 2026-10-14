'use client';

import { useEffect, useState, type FormEvent } from 'react';
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const set = (field: keyof UserFormValues) => (v: string) => setValues(old => ({ ...old, [field]: v }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user && !isEmail(values.email.trim())) { setError('יש להזין כתובת מייל תקינה'); return; }
    setError(null);
    setSaving(true);
    const ok = await onSubmit(values);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16, backgroundColor: 'rgba(42,26,34,0.45)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
        style={{
          width: '100%', maxWidth: 440, maxHeight: '100%', overflowY: 'auto', backgroundColor: C.card,
          borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)', animation: 'fadeIn 0.15s ease-out',
        }}
      >
        <h2 id="user-form-title" style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>
          {user ? 'עריכת משתמשת' : 'הוספת משתמשת'}
        </h2>

        <Field label="מייל (חשבון Google שאיתו היא נכנסת)">
          <input
            type="email" dir="ltr" required autoFocus={!user} disabled={!!user}
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
            <option value="volunteer">{ROLE_LABELS.volunteer} – רואה רק את מה שמשובץ לה</option>
            <option value="admin">{ROLE_LABELS.admin} – רואה ומנהלת הכול</option>
          </select>
        </Field>

        {error && <div role="alert" style={{ color: C.danger, fontSize: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="submit" disabled={saving} style={buttonStyle('primary')}>
            {saving ? 'שומרת...' : 'שמירה'}
          </button>
          <button type="button" disabled={saving} onClick={onClose} style={buttonStyle('secondary')}>ביטול</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600, color: C.sub }}>
      {label}
      {children}
    </label>
  );
}
