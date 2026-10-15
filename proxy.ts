import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Runs on every page request. Refreshes an expired Supabase session and
 * forwards the updated cookies, and sends signed-out visitors to
 * /login?next=<path>.
 *
 * Public paths (login, OAuth callback) and all /api/* routes are left alone —
 * API routes check their own auth and must answer JSON, not a redirect.
 * Whether a signed-in account is actually AUTHORIZED is decided by RLS +
 * authorized_users (see AppShell and /api/me), not here.
 */

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isHttps = request.nextUrl.protocol === 'https:';

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          // Persistent cookies (never a browser-session cookie), so a phone
          // stays signed in after the browser is closed.
          const isDeletion = options?.maxAge === 0;
          response.cookies.set(name, value, isDeletion ? options : {
            ...options,
            maxAge:   options?.maxAge   ?? ONE_YEAR_SECONDS,
            sameSite: options?.sameSite ?? 'lax',
            path:     options?.path     ?? '/',
            httpOnly: options?.httpOnly ?? false,
            secure:   options?.secure   ?? isHttps,
          });
        }
      },
    },
  });

  let signedIn = false;
  let authCheckFailed = false;
  try {
    const { data } = await supabase.auth.getUser();
    signedIn = !!data.user;
  } catch (e) {
    authCheckFailed = true;
    console.warn('[proxy] supabase.auth.getUser failed:', (e as Error).message);
  }

  // Don't lock people out on a transient Supabase/network error — without a
  // valid session the page (and RLS) still won't show any data.
  if (!signedIn && !authCheckFailed && !isPublicPath(path)) {
    const loginUrl = new URL('/login', request.url);
    if (path !== '/') loginUrl.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

function isPublicPath(path: string): boolean {
  return path === '/login'
    || path === '/confirm'          // the mother's reminder link (secret token, no login)
    || path.startsWith('/auth/')
    || path.startsWith('/api/');
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|txt)$).*)',
  ],
};
