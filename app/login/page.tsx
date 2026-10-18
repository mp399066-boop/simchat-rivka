'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import Logo from '@/components/ui/Logo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { buttonStyle, colors as C, heroGradient, inputStyle } from '@/lib/theme';

const noSubscribe = () => () => {};

const ERRORS: Record<string, string> = {
  missing_code:         'הכניסה לא הושלמה. נסי שוב.',
  auth_callback_failed: 'הכניסה נכשלה. נסי שוב.',
  not_configured:       'המערכת עדיין לא חוברה למסד הנתונים.',
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      console.error('[login] signInWithPassword failed:', error.message);
      setError(error.status === 400 ? 'המייל או הסיסמה לא נכונים. נסי שוב.' : 'לא הצלחנו להיכנס. נסי שוב.');
      setLoading(false);
      return;
    }
    // Same-site paths only, so ?next= can't send her to another site.
    const next = new URLSearchParams(window.location.search).get('next');
    const safe = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';
    window.location.assign(safe);
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

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" dir="ltr" autoComplete="username" required placeholder="מייל" aria-label="מייל"
            value={email} onChange={e => setEmail(e.target.value)} maxLength={200}
            style={{ ...inputStyle, textAlign: 'left' }}
          />
          <input
            type="password" dir="ltr" autoComplete="current-password" required placeholder="סיסמה" aria-label="סיסמה"
            value={password} onChange={e => setPassword(e.target.value)} maxLength={200}
            style={{ ...inputStyle, textAlign: 'left' }}
          />
          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            style={{
              ...buttonStyle('primary'), width: '100%', minHeight: 50, fontSize: 16,
              cursor: loading ? 'wait' : 'pointer', opacity: !isSupabaseConfigured ? 0.6 : 1,
            }}
          >
            {loading ? 'מתחברת...' : 'כניסה'}
          </button>
        </form>

        <p style={{ color: C.muted, fontSize: 13, marginTop: 20 }}>
          הכניסה למורשות בלבד
        </p>
        </div>
      </div>
    </div>
  );
}
