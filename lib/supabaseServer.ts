import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client with the service role (bypasses RLS).
 * No silent fallback to the public key: with RLS on, that would only turn
 * into confusing empty results.
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url) throw new Error('Supabase env var missing: NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('Supabase env var missing: SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}
