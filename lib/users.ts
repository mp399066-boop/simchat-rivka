import type { Role } from '@/lib/auth';

/**
 * A row of authorized_users — the team list: the manager and every
 * volunteer, also those who never sign in (no e-mail).
 */
export interface AuthorizedUser {
  id: string;
  email: string | null;          // null = not in the system (no sign-in, no e-mail)
  full_name: string | null;
  phone: string | null;
  city: string | null;
  can_deliver: boolean;
  can_cook: boolean;
  notes: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

/** The columns the API reads and returns. */
export const USER_COLUMNS = 'id, email, full_name, phone, city, can_deliver, can_cook, notes, role, is_active, created_at';

export const ROLE_LABELS: Record<Role, string> = {
  admin:     'מנהלת',
  volunteer: 'מתנדבת',
};

/** How to show a person: her name, else her e-mail. */
export const displayName = (u: Pick<AuthorizedUser, 'full_name' | 'email'>) => u.full_name || u.email || 'ללא שם';

/** "מוסרת ומבשלת" / "מוסרת" / "מבשלת" / "". */
export function tasksLabel(u: Pick<AuthorizedUser, 'can_deliver' | 'can_cook'>): string {
  if (u.can_deliver && u.can_cook) return 'מוסרת ומבשלת';
  if (u.can_deliver) return 'מוסרת';
  if (u.can_cook) return 'מבשלת';
  return '';
}

export const isRole = (v: unknown): v is Role => v === 'admin' || v === 'volunteer';

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Trimmed text, or null when empty. Non-strings become null. */
export function cleanText(v: unknown, maxLength = 200): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, maxLength);
  return t || null;
}

/**
 * The editable fields of a person from a request body. With `partial`, only
 * the fields present are returned (PATCH). E-mail is optional (no e-mail =
 * a volunteer who does not sign in). Returns a Hebrew error instead.
 */
export function parsePerson(body: Record<string, unknown> | null, normalize: (e: string) => string, partial = false):
  { data: Record<string, unknown>; error: null } | { data: null; error: string } {
  const b = body ?? {};
  const has = (k: string) => !partial || k in b;
  const data: Record<string, unknown> = {};

  if (has('email')) {
    const email = typeof b.email === 'string' ? normalize(b.email) : '';
    if (email && !isEmail(email)) return { data: null, error: 'כתובת המייל אינה תקינה' };
    data.email = email || null;
  }
  if (has('full_name'))   data.full_name   = cleanText(b.full_name);
  if (has('phone'))       data.phone       = cleanText(b.phone, 30);
  if (has('city'))        data.city        = cleanText(b.city, 100);
  if (has('notes'))       data.notes       = cleanText(b.notes, 1000);
  if (has('can_deliver')) data.can_deliver = b.can_deliver !== false;
  if (has('can_cook'))    data.can_cook    = b.can_cook !== false;
  if (has('role')) {
    const role = b.role ?? 'volunteer';
    if (!isRole(role)) return { data: null, error: 'תפקיד לא חוקי' };
    data.role = role;
  }
  if (!partial && !data.email && !data.full_name) return { data: null, error: 'יש למלא שם' };
  if (!partial && data.role === 'admin' && !data.email) return { data: null, error: 'למנהלת חייב להיות מייל כדי להיכנס למערכת' };
  return { data, error: null };
}
