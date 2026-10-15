'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

const icons = {
  home:    'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z',
  mothers: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  users:   'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
} as const;

const navItems: { href: string; label: string; volunteerLabel?: string; icon: keyof typeof icons; adminOnly?: boolean }[] = [
  { href: '/',        label: 'בית',       icon: 'home' },
  { href: '/mothers', label: 'יולדות',    volunteerLabel: 'המשלוחים שלי', icon: 'mothers' },
  { href: '/users',   label: 'משתמשות',   icon: 'users', adminOnly: true },
];

function Icon({ name, size = 22 }: { name: keyof typeof icons; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}

/** Pages shown without the shell (and without the access check). */
const isBarePath = (p: string | null) => p === '/login' || !!p?.startsWith('/auth/');

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
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30, backgroundColor: C.card,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            maxWidth: 1100, margin: '0 auto', padding: '0 16px', height: 60,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <Logo size={36} />
              <span style={{ fontSize: 17, fontWeight: 700, color: C.accent, whiteSpace: 'nowrap' }}>שמחת רבקה</span>
            </Link>

            {/* Desktop navigation */}
            <nav className="nav-desktop" style={{ gap: 4, flex: 1 }}>
              {items.map(item => (
                <Link key={item.href} href={item.href} style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 15, textDecoration: 'none',
                  fontWeight: isActive(item.href) ? 700 : 500,
                  color: isActive(item.href) ? C.accent : C.sub,
                  backgroundColor: isActive(item.href) ? C.accentSub : 'transparent',
                }}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span className="nav-desktop" style={{ fontSize: 14, color: C.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {me.fullName || me.email}
              </span>
              <button onClick={signOut} style={{ ...buttonStyle('secondary'), minHeight: 40, padding: '6px 12px', fontSize: 14 }}>
                יציאה
              </button>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="app-main" style={{ flex: 1, width: '100%', maxWidth: 1100, margin: '0 auto', padding: 16 }}>
          {onAdminOnlyPage && !isAdmin
            ? <StatusMessage title="אין הרשאה" text="הדף הזה זמין למנהלת בלבד." />
            : children}
        </main>

        {/* Mobile navigation (bottom tabs) */}
        <nav className="nav-mobile" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, height: 64,
          backgroundColor: C.card, borderTop: `1px solid ${C.border}`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {items.map(item => (
            <Link key={item.href} href={item.href} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2, fontSize: 12, textDecoration: 'none',
              fontWeight: isActive(item.href) ? 700 : 500,
              color: isActive(item.href) ? C.accent : C.sub,
            }}>
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </MeContext.Provider>
  );
}
