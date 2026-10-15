'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMe } from '@/components/layout/AppShell';
import { useFeedback } from '@/components/ui/Feedback';
import Icon from '@/components/ui/Icon';
import PageHero from '@/components/ui/PageHero';
import StatusMessage from '@/components/ui/StatusMessage';
import MailSettingsCard from '@/components/users/MailSettingsCard';
import UserForm, { type UserFormValues } from '@/components/users/UserForm';
import { authFetch } from '@/lib/supabase';
import { ROLE_LABELS, type AuthorizedUser } from '@/lib/users';
import { buttonStyle, card, colors as C } from '@/lib/theme';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; users: AuthorizedUser[] };

async function fetchUsers(): Promise<Load> {
  try {
    const res = await authFetch('/api/admin/users');
    return res.ok ? { state: 'ready', users: await res.json() } : { state: 'error' };
  } catch {
    return { state: 'error' };
  }
}

/** Error text from an API response, or a fallback. */
async function errorText(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === 'string' && res.status !== 401 ? body.error : fallback;
}

export default function UsersPage() {
  const me = useMe();
  const { confirm, toast } = useFeedback();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [editing, setEditing] = useState<AuthorizedUser | 'new' | null>(null);

  const refresh = useCallback(() => fetchUsers().then(setLoad), []);

  useEffect(() => {
    let cancelled = false;
    fetchUsers().then(result => { if (!cancelled) setLoad(result); });
    return () => { cancelled = true; };
  }, []);

  const isMe = (u: AuthorizedUser) => u.email.toLowerCase() === me.email.toLowerCase();

  async function save(values: UserFormValues): Promise<boolean> {
    const target = editing === 'new' ? null : editing;
    const res = await authFetch(target ? `/api/admin/users/${target.id}` : '/api/admin/users', {
      method: target ? 'PATCH' : 'POST',
      body: JSON.stringify(target
        ? { full_name: values.full_name, phone: values.phone, role: values.role }
        : values),
    }).catch(() => null);
    if (!res?.ok) {
      toast.error(res ? await errorText(res, 'השמירה נכשלה') : 'אין חיבור לאינטרנט');
      return false;
    }
    toast.success(target ? 'הפרטים עודכנו' : 'המשתמשת נוספה. עכשיו היא יכולה להיכנס עם חשבון ה-Google שלה.');
    await refresh();
    return true;
  }

  async function toggleActive(u: AuthorizedUser) {
    const res = await authFetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH', body: JSON.stringify({ is_active: !u.is_active }),
    }).catch(() => null);
    if (!res?.ok) { toast.error(res ? await errorText(res, 'העדכון נכשל') : 'אין חיבור לאינטרנט'); return; }
    toast.success(u.is_active ? 'הגישה הושהתה' : 'הגישה הופעלה מחדש');
    await refresh();
  }

  async function remove(u: AuthorizedUser) {
    const ok = await confirm({
      message: `למחוק את ${u.full_name || u.email} מרשימת המורשות? היא לא תוכל להיכנס יותר למערכת.`,
    });
    if (!ok) return;
    const res = await authFetch(`/api/admin/users/${u.id}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) { toast.error(res ? await errorText(res, 'המחיקה נכשלה') : 'אין חיבור לאינטרנט'); return; }
    toast.success('נמחקה מהרשימה');
    await refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero
        title="משתמשות"
        subtitle="רק מי שמופיעה כאן יכולה להיכנס למערכת"
        action={
          <button onClick={() => setEditing('new')} style={buttonStyle('light')}>
            <Icon name="plus" size={18} />משתמשת חדשה
          </button>
        }
      />

      <MailSettingsCard />

      {load.state === 'loading' && <StatusMessage title="טוען..." />}
      {load.state === 'error' && (
        <StatusMessage title="טעינת הרשימה נכשלה" text="כדאי לבדוק את החיבור לאינטרנט.">
          <button onClick={() => { setLoad({ state: 'loading' }); refresh(); }} style={buttonStyle('primary')}>נסי שוב</button>
        </StatusMessage>
      )}
      {load.state === 'ready' && load.users.length === 0 && (
        <StatusMessage title="אין עדיין משתמשות" text="לחצי על 'הוספת משתמשת' כדי להוסיף את הראשונה." />
      )}

      {load.state === 'ready' && load.users.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 440px), 1fr))', gap: 16 }}>
          {load.users.map(u => (
            <div key={u.id} style={{
              ...card, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
              opacity: u.is_active ? 1 : 0.65,
            }}>
              <span style={{
                width: 50, height: 50, borderRadius: 16, flexShrink: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', backgroundColor: C.accentSub, color: C.accent,
              }}>
                <Icon name="user" size={24} />
              </span>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{u.full_name || 'ללא שם'}</span>
                  <Badge tone={u.role === 'admin' ? 'accent' : 'plain'}>{ROLE_LABELS[u.role]}</Badge>
                  {!u.is_active && <Badge tone="muted">מושהית</Badge>}
                  {isMe(u) && <Badge tone="plain">זו את</Badge>}
                </div>
                <div dir="ltr" style={{ fontSize: 14, color: C.sub, marginTop: 4, textAlign: 'right', overflowWrap: 'anywhere' }}>
                  {u.email}{u.phone ? ` · ${u.phone}` : ''}
                </div>
              </div>
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%',
                paddingTop: 12, borderTop: `1px solid ${C.border}`,
              }}>
                <button onClick={() => setEditing(u)} style={buttonStyle('secondary')}>עריכה</button>
                {!isMe(u) && (
                  <>
                    <button onClick={() => toggleActive(u)} style={buttonStyle('secondary')}>
                      {u.is_active ? 'השהיה' : 'הפעלה'}
                    </button>
                    <button onClick={() => remove(u)} style={{ ...buttonStyle('secondary'), color: C.danger }}>מחיקה</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <UserForm
          user={editing === 'new' ? undefined : editing}
          lockRole={editing !== 'new' && isMe(editing)}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Badge({ tone, children }: { tone: 'accent' | 'plain' | 'muted'; children: React.ReactNode }) {
  const look = {
    accent: { bg: C.accentSub, color: C.accent, border: C.accentRim },
    plain:  { bg: C.tile,      color: C.sub,    border: C.border },
    muted:  { bg: '#F3F4F6',   color: C.muted,  border: '#E5E7EB' },
  }[tone];
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
      backgroundColor: look.bg, color: look.color, border: `1px solid ${look.border}`,
    }}>
      {children}
    </span>
  );
}
