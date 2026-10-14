import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /auth/callback — Supabase sends the browser here after Google sign-in
 * (PKCE flow) with ?code=<one-time code>. The code is exchanged for a session
 * and the session cookies are set directly on the redirect response.
 */

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * Only same-site paths are allowed after login. Without this, a "next" of
 * //evil.com or https://evil.com would make the login flow an open redirect.
 */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  return raw;
}

function safeDecode(v: string | undefined): string | null {
  if (!v) return null;
  try { return decodeURIComponent(v); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  // The login page stores the destination in a short-lived cookie, so the
  // OAuth redirectTo URL stays exactly as listed in Supabase.
  const next = safeNextPath(safeDecode(req.cookies.get('post_login_next')?.value));

  if (!code) {
    console.warn('[auth/callback] missing code');
    return NextResponse.redirect(new URL('/login?error=missing_code', origin));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('[auth/callback] Supabase env vars missing');
    return NextResponse.redirect(new URL('/login?error=not_configured', origin));
  }

  const response = NextResponse.redirect(new URL(next, origin));
  response.cookies.set('post_login_next', '', { path: '/', maxAge: 0 });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          const isDeletion = options?.maxAge === 0;
          response.cookies.set(name, value, isDeletion ? options : {
            ...options,
            maxAge:   options?.maxAge   ?? ONE_YEAR_SECONDS,
            sameSite: options?.sameSite ?? 'lax',
            path:     options?.path     ?? '/',
            httpOnly: options?.httpOnly ?? false,
            secure:   options?.secure   ?? origin.startsWith('https://'),
          });
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed', { message: error.message, status: error.status });
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin));
  }

  return response;
}
