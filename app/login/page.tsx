'use client';

import { useState, useSyncExternalStore } from 'react';
import Logo from '@/components/ui/Logo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors as C } from '@/lib/theme';

const noSubscribe = () => () => {};

const ERRORS: Record<string, string> = {
  missing_code:         'הכניסה לא הושלמה. נסי שוב.',
  auth_callback_failed: 'הכניסה נכשלה. נסי שוב.',
  not_configured:       'המערכת עדיין לא חוברה למסד הנתונים.',
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    // Remember where to return after sign-in. A short-lived cookie (read and
    // validated by /auth/callback) keeps the OAuth redirectTo URL fixed, so
    // it always matches the Supabase redirect allow-list.
    const next = new URLSearchParams(window.location.search).get('next');
    document.cookie = next
      ? `post_login_next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`
      : 'post_login_next=; path=/; max-age=0';

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      console.error('[login] signInWithOAuth failed:', error.message);
      setError('לא הצלחנו להתחיל את הכניסה. נסי שוב.');
      setLoading(false);
    }
  }

  // Error code from /auth/callback (?error=…). Read from the URL after
  // hydration (server snapshot = none), so the page itself stays static.
  const urlError = useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).get('error'),
    () => null,
  );
  const shownError = error
    ?? (!isSupabaseConfigured ? ERRORS.not_configured : urlError ? (ERRORS[urlError] ?? ERRORS.auth_callback_failed) : null);

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: C.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        backgroundColor: C.card, borderRadius: 18, border: `1px solid ${C.border}`,
        boxShadow: '0 4px 24px rgba(60,20,40,0.08)', padding: '36px 24px',
        width: '100%', maxWidth: 400, textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Logo size={180} variant="full" />
        </div>

        <p style={{ color: C.sub, fontSize: 16, margin: '0 0 28px' }}>
          ניהול ארוחות ליולדות
        </p>

        {shownError && (
          <div role="alert" style={{
            backgroundColor: C.dangerSub, border: '1px solid #FCA5A5', borderRadius: 10,
            padding: '10px 14px', color: C.danger, fontSize: 15, marginBottom: 20,
          }}>
            {shownError}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading || !isSupabaseConfigured}
          style={{
            width: '100%', minHeight: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '12px 20px', borderRadius: 12, border: `1.5px solid ${C.border}`,
            backgroundColor: C.card, color: C.text, fontSize: 16, fontWeight: 600, fontFamily: 'inherit',
            cursor: loading ? 'wait' : 'pointer', opacity: !isSupabaseConfigured ? 0.6 : 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
          </svg>
          {loading ? 'מתחברת...' : 'כניסה עם Google'}
        </button>

        <p style={{ color: C.muted, fontSize: 13, marginTop: 20 }}>
          הכניסה למורשות בלבד
        </p>
      </div>
    </div>
  );
}
