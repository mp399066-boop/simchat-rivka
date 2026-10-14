/**
 * GET /api/me — the signed-in user's access level, so the app shell can gate
 * the UI:
 *   200 { email, role, fullName } — active authorized user
 *   401                           — missing / invalid token (not signed in)
 *   403                           — valid Google account, not authorized
 *
 * The real enforcement is RLS and the per-route checks; this only drives
 * what the UI shows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { getAuthorizedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getAuthorizedUser(req);
  if (user) return NextResponse.json({ email: user.email, role: user.role, fullName: user.fullName });

  // Distinguish "bad token" (401) from "valid account, not authorized" (403).
  const { data } = await createServerClient().auth.getUser(authHeader.slice(7));
  return data.user
    ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
