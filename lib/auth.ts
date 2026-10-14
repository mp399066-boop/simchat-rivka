import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';

export type Role = 'admin' | 'volunteer';

export interface AppUser {
  id: string;           // Supabase Auth user id
  email: string;
  role: Role;
  fullName: string | null;
}

/**
 * Checks the Bearer token in the Authorization header with Supabase Auth,
 * then looks the e-mail up in authorized_users (case-insensitive, trimmed).
 *
 * Returns null on any failure — callers answer 401/403.
 * Logs only the denial reason, never the e-mail or the token.
 */
async function resolveUser(req: NextRequest, tag: string): Promise<AppUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const supabase = createServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.slice(7));
  if (userError || !user?.email) {
    console.warn(`[${tag}] denied — invalid token`);
    return null;
  }

  const email = normalizeEmail(user.email);
  // ilike = case-insensitive, like is_authorized_user() in SQL. Addresses are
  // stored normalized (see normalizeEmail); % and _ are escaped so they match
  // literally.
  const { data: row, error: dbError } = await supabase
    .from('authorized_users')
    .select('role, is_active, full_name')
    .ilike('email', email.replace(/[%_\\]/g, '\\$&'))
    .maybeSingle();

  if (dbError) {
    console.error(`[${tag}] denied — authorized_users query failed:`, dbError.message);
    return null;
  }
  if (!row || !row.is_active) {
    console.warn(`[${tag}] denied — not an active authorized user`);
    return null;
  }

  return { id: user.id, email, role: row.role === 'admin' ? 'admin' : 'volunteer', fullName: row.full_name };
}

/** Lower-case, trimmed, and without invisible characters copied from mail apps. */
export function normalizeEmail(raw: string): string {
  return raw.replace(/[​-‏‪-‮⁦-⁩﻿]/g, '').trim().toLowerCase();
}

/** Any active authorized user (manager or volunteer). */
export function getAuthorizedUser(req: NextRequest): Promise<AppUser | null> {
  return resolveUser(req, 'getAuthorizedUser');
}

/** An active authorized user whose role is 'admin' (the manager). */
export async function getAdminUser(req: NextRequest): Promise<AppUser | null> {
  const user = await resolveUser(req, 'getAdminUser');
  if (user && user.role !== 'admin') {
    console.warn('[getAdminUser] denied — role is not admin');
    return null;
  }
  return user;
}
