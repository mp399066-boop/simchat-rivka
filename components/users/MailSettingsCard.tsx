'use client';

import { useEffect, useState } from 'react';
import { useFeedback } from '@/components/ui/Feedback';
import Icon from '@/components/ui/Icon';
import { authFetch } from '@/lib/supabase';
import { buttonStyle, card, colors as C } from '@/lib/theme';

type Status = { state: 'loading' } | { state: 'error' } | { state: 'ready'; configured: boolean; to: string };

/** Whether reminder e-mails are set up, and a "send me a sample" button (manager). */
export default function MailSettingsCard() {
  const { toast } = useFeedback();
  const [status, setStatus] = useState<Status>({ state: 'loading' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authFetch('/api/reminders/test')
      .then(async res => (res.ok ? { state: 'ready' as const, ...(await res.json()) } : { state: 'error' as const }))
      .catch(() => ({ state: 'error' as const }))
      .then(s => { if (!cancelled) setStatus(s); });
    return () => { cancelled = true; };
  }, []);

  async function sendSample() {
    setSending(true);
    try {
      const res = await authFetch('/api/reminders/test', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (res.ok) toast.success(`נשלחה דוגמה ל-${body.to}. כדאי לבדוק את תיבת הדואר.`);
      else toast.error(typeof body.error === 'string' && res.status !== 401 ? body.error : 'השליחה נכשלה');
    } catch {
      toast.error('אין חיבור לאינטרנט');
    }
    setSending(false);
  }

  const on = status.state === 'ready' && status.configured;
  return (
    <section style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{
        width: 50, height: 50, borderRadius: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: on ? '#DCFCE7' : C.accentSub, color: on ? C.success : C.accent,
      }}>
        <Icon name="mail" size={24} />
      </span>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>תזכורות במייל</h2>
        <div style={{ fontSize: 14, color: C.sub, marginTop: 2 }}>
          {status.state === 'loading' && 'בודקת...'}
          {status.state === 'error' && 'לא הצלחנו לבדוק את מצב המיילים'}
          {status.state === 'ready' && (status.configured
            ? 'פעיל: כל ערב יוצאת תזכורת ליולדות של מחר שיש להן מייל (עם כפתור אישור), ואלייך סיכום של מחר'
            : 'עוד לא הוגדר: חסרה סיסמת אפליקציה של Gmail')}
        </div>
      </div>
      {on && (
        <button onClick={sendSample} disabled={sending} style={buttonStyle('secondary')}>
          {sending ? 'שולחת...' : 'שליחת דוגמה אליי'}
        </button>
      )}
    </section>
  );
}
