'use client';

import { useState, useSyncExternalStore } from 'react';
import Logo from '@/components/ui/Logo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors as C, heroGradient } from '@/lib/theme';

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
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        backgroundColor: C.card, borderRadius: 28, border: `1px solid ${C.border}`,
        boxShadow: '0 24px 60px rgba(110,11,53,0.14)', overflow: 'hidden',
        width: '100%', maxWidth: 420, textAlign: 'center',
      }}>
        {/* Berry banner with the logo */}
        <div style={{ position: 'relative', background: heroGradient, padding: '28px 24px 70px', color: '#FFFFFF' }}>
          <div aria-hidden style={{
            position: 'absolute', width: 180, height: 180, borderRadius: '50%', left: -50, top: -80,
            background: 'rgba(255,255,255,0.08)',
          }} />
          <div style={{ position: 'relative', fontSize: 15, fontWeight: 600, color: '#FFE9F2' }}>ברוכה הבאה ✨</div>
          <h1 style={{ position: 'relative', margin: '6px 0 0', fontSize: 26, fontWeight: 800 }}>ניהול ארוחות ליולדות</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -58 }}>
          <span style={{
            width: 200, height: 200, borderRadius: '50%', backgroundColor: '#FFFFFF',
            border: `6px solid ${C.accentSub}`, boxShadow: '0 10px 30px rgba(110,11,53,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            <Logo size={168} variant="full" />
          </span>
        </div>

        <div style={{ padding: '22px 24px 28px' }}>

        {shownError && (
          <div role="alert" style={{
            backgroundColor: C.dangerSub, border: '1px solid #FCA5A5', borderRadius: 14,
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
            gap: 10, padding: '12px 20px', borderRadius: 999, border: `1.5px solid ${C.border}`,
            backgroundColor: C.card, color: C.text, fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
            cursor: loading ? 'wait' : 'pointer', opacity: !isSupabaseConfigured ? 0.6 : 1,
            boxShadow: '0 6px 18px rgba(110,11,53,0.10)',
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
    </div>
  );
}
