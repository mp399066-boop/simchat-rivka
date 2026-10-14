import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL      || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

/**
 * Browser-side Supabase client. `@supabase/ssr` keeps the session in cookies
 * (so the proxy sees the same session) and uses the PKCE flow; the OAuth code
 * itself is exchanged on the server in /auth/callback.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = !supabaseUrl.includes('placeholder');

/**
 * fetch() to our own API routes with the signed-in user's token attached.
 * API routes check the token themselves (see lib/auth.ts).
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers });
}
