'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon, { type IconName } from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import StatusMessage from '@/components/ui/StatusMessage';
import { authFetch, supabase } from '@/lib/supabase';
import { buttonStyle, colors as C } from '@/lib/theme';
import type { Role } from '@/lib/auth';

/* ── Who is using the app ────────────────────────────────────────────────── */

export interface Me { email: string; role: Role; fullName: string | null }

const MeContext = createContext<Me | null>(null);

/** The signed-in, authorized user. Only usable inside the app shell. */
export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error('useMe must be used inside <AppShell>');
  return me;
}

type Access =
  | { state: 'loading' }
  | { state: 'denied' }
  | { state: 'error' }
  | { state: 'granted'; me: Me };

/* ── Navigation ──────────────────────────────────────────────────────────── */

const navItems: { href: string; label: string; volunteerLabel?: string; icon: IconName; adminOnly?: boolean }[] = [
  { href: '/',        label: 'בית',       icon: 'home' },
  { href: '/mothers', label: 'יולדות',    volunteerLabel: 'המשלוחים שלי', icon: 'heart' },
  { href: '/prep',    label: 'הכנות',     volunteerLabel: 'ההכנות שלי', icon: 'chef' },
  { href: '/menu',    label: 'תפריט ומלאי', icon: 'list',  adminOnly: true },
  { href: '/users',   label: 'מתנדבות',   icon: 'users', adminOnly: true },
];

/** Pages shown without the shell (and without the access check). */
const isBarePath = (p: string | null) => p === '/login' || p === '/confirm' || !!p?.startsWith('/auth/');

/* ── Shell ───────────────────────────────────────────────────────────────── */

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const bare     = isBarePath(pathname);
  const [access, setAccess] = useState<Access>({ state: 'loading' });

  // Signed in? Listed in authorized_users? Which role?
  useEffect(() => {
    if (bare) return;
    let cancelled = false;
    const toLogin = () =>
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) { toLogin(); return; }
      try {
        const res = await authFetch('/api/me');
        if (cancelled) return;
        if (res.status === 401) toLogin();
        else if (res.status === 403) setAccess({ state: 'denied' });
        else if (!res.ok) setAccess({ state: 'error' });
        else setAccess({ state: 'granted', me: await res.json() });
      } catch {
        if (!cancelled) setAccess({ state: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [bare, router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (bare) return <>{children}</>;
  if (access.state === 'loading') return <StatusMessage fullPage title="טוען..." />;
  if (access.state === 'error') {
    return (
      <StatusMessage fullPage title="אין חיבור למערכת" text="לא הצלחנו לבדוק את ההרשאה שלך. כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.">
        <button onClick={() => window.location.reload()} style={buttonStyle('primary')}>נסי שוב</button>
      </StatusMessage>
    );
  }
  if (access.state === 'denied') {
    return (
      <StatusMessage fullPage title="אין הרשאה"
        text="החשבון שאיתו נכנסת אינו ברשימת המורשות. אפשר לבקש ממנהלת הארגון להוסיף אותך.">
        <button onClick={signOut} style={buttonStyle('secondary')}>יציאה וכניסה עם חשבון אחר</button>
      </StatusMessage>
    );
  }

  const { me } = access;
  const isAdmin = me.role === 'admin';
  const items = navItems
    .filter(i => !i.adminOnly || isAdmin)
    .map(i => ({ ...i, label: !isAdmin && i.volunteerLabel ? i.volunteerLabel : i.label }));
  const onAdminOnlyPage = navItems.some(i => i.adminOnly && pathname?.startsWith(i.href));
  const isActive = (href: string) => href === '/' ? pathname === '/' : !!pathname?.startsWith(href);

  return (
    <MeContext.Provider value={me}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Floating top bar */}
        <header className="no-print" style={{ position: 'sticky', top: 0, zIndex: 30, padding: '12px 12px 0' }}>
          <div style={{
            maxWidth: 1180, margin: '0 auto', padding: '8px 10px 8px 12px', minHeight: 64,
            display: 'flex', alignItems: 'center', gap: 12, borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
            border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(110,11,53,0.08)',
          }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0 }}>
              <span style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentSub,
                border: `2px solid ${C.accentRim}`,
              }}>
                <Logo size={32} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.deep, whiteSpace: 'nowrap' }}>שמחת רבקה</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.accent, whiteSpace: 'nowrap' }}>ארוחות ליולדות</span>
              </span>
            </Link>

            <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Desktop navigation */}
              <nav className="nav-desktop" style={{ gap: 6 }}>
                {items.map(item => {
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44,
                      padding: '8px 18px', borderRadius: 999, fontSize: 15, fontWeight: 700,
                      textDecoration: 'none',
                      color: active ? '#FFFFFF' : C.sub,
                      backgroundColor: active ? C.accent : C.tile,
                      boxShadow: active ? '0 6px 16px rgba(200,21,91,0.28)' : 'none',
                    }}>
                      <Icon name={item.icon} size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <button onClick={signOut} title="יציאה" aria-label="יציאה" style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                backgroundColor: C.tile, color: C.sub, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="logout" size={19} />
              </button>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="app-main" style={{ flex: 1, width: '100%', maxWidth: 1180, margin: '0 auto', padding: '18px 12px 32px' }}>
          {onAdminOnlyPage && !isAdmin
            ? <StatusMessage title="אין הרשאה" text="הדף הזה זמין למנהלת בלבד." />
            : children}
        </main>

        {/* Mobile navigation — floating tab bar */}
        <nav className="nav-mobile no-print" style={{
          position: 'fixed', left: 12, right: 12, bottom: 'calc(10px + env(safe-area-inset-bottom))', zIndex: 30,
          height: 66, padding: 6, gap: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(10px)', border: `1px solid ${C.border}`, boxShadow: '0 10px 30px rgba(110,11,53,0.14)',
        }}>
          {items.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, fontSize: 12, fontWeight: 700, textDecoration: 'none', borderRadius: 999,
                color: active ? '#FFFFFF' : C.sub,
                backgroundColor: active ? C.accent : 'transparent',
              }}>
                <Icon name={item.icon} size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </MeContext.Provider>
  );
}
