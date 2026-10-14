import type { Role } from '@/lib/auth';

/** A row of authorized_users, as the user-management API returns it. */
export interface AuthorizedUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin:     'מנהלת',
  volunteer: 'מתנדבת',
};

export const isRole = (v: unknown): v is Role => v === 'admin' || v === 'volunteer';

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Trimmed text, or null when empty. Non-strings become null. */
export function cleanText(v: unknown, maxLength = 200): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, maxLength);
  return t || null;
}
