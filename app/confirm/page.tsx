'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Logo from '@/components/ui/Logo';
import { fullDate } from '@/lib/dates';
import { buttonStyle, colors as C, heroGradient, inputStyle } from '@/lib/theme';

/**
 * PUBLIC page (no login): the mother confirms her reminder e-mail.
 * The link carries ?t=<secret token>&a=ok|change. Nothing is recorded until
 * she presses a button — mail scanners that open links don't answer for her.
 */

const noSubscribe = () => () => {};
// A string snapshot (stable between calls); null on the server = not read yet.
const readParams = () => {
  const p = new URLSearchParams(window.location.search);
  return `${p.get('t') ?? ''}|${p.get('a') ?? ''}`;
};

type Info = { firstName: string; deliveryDate: string | null; response: 'ok' | 'change' | null };
type View =
  | { state: 'loading' }
  | { state: 'invalid'; message: string }
  | { state: 'ask'; info: Info }
  | { state: 'saving'; info: Info }
  | { state: 'done'; info: Info; response: 'ok' | 'change' };

export default function ConfirmPage() {
  const params = useSyncExternalStore<string | null>(noSubscribe, readParams, () => null);
  const [token = '', preset = ''] = params?.split('|') ?? [];
  const [view, setView] = useState<View>({ state: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<'ok' | 'change' | null>(null);
  const [note, setNote] = useState('');
  const picked = choice ?? (preset === 'ok' || preset === 'change' ? preset : null);

  useEffect(() => {
    if (!token) return;   // not read yet, or no token in the link
    let cancelled = false;
    fetch(`/api/confirm?t=${encodeURIComponent(token)}`)
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        setView(res.ok ? { state: 'ask', info: body } : { state: 'invalid', message: body.error ?? 'הקישור אינו תקף' });
      })
      .catch(() => { if (!cancelled) setView({ state: 'invalid', message: 'אין חיבור לאינטרנט' }); });
    return () => { cancelled = true; };
  }, [token]);

  async function send() {
    if (view.state !== 'ask' || !picked) return;
    const info = view.info;
    setView({ state: 'saving', info });
    setError(null);
    try {
      const res = await fetch('/api/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token, response: picked, note: picked === 'change' ? note : '' }),
      });
      if (!res.ok) throw new Error();
      setView({ state: 'done', info, response: picked });
    } catch {
      setView({ state: 'ask', info });
      setError('השמירה נכשלה, נסי שוב בעוד רגע');
    }
  }

  const missing = params !== null && !token;
  const loading = !missing && view.state === 'loading';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{
        width: '100%', maxWidth: 440, backgroundColor: C.card, borderRadius: 28, overflow: 'hidden',
        border: `1px solid ${C.border}`, boxShadow: '0 24px 60px rgba(110,11,53,0.14)',
      }}>
        <div style={{ background: heroGradient, color: '#FFFFFF', padding: '24px 24px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Logo size={46} />
          </span>
          <div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>ארגון שמחת רבקה</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>ארוחת בוקר ליולדת</div>
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 16, color: C.text, lineHeight: 1.7 }}>
          {loading && <div style={{ color: C.sub }}>טוען...</div>}
          {(missing || view.state === 'invalid') && (
            <div style={{ color: C.danger, fontWeight: 600 }}>
              {view.state === 'invalid' ? view.message : 'הקישור אינו תקף'}
            </div>
          )}

          {(view.state === 'ask' || view.state === 'saving') && (
            <>
              <div>
                שלום {view.info.firstName} 💐<br />
                {view.info.deliveryDate
                  ? <>ארוחת הבוקר תגיע אלייך <strong>{fullDate(view.info.deliveryDate)}</strong>.</>
                  : <>ארוחת הבוקר תגיע אלייך בקרוב.</>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type="button" onClick={() => setChoice('ok')} aria-pressed={picked === 'ok'}
                  style={{ ...buttonStyle(picked === 'ok' ? 'primary' : 'secondary'), width: '100%' }}>
                  ראיתי, תודה! ✓
                </button>
                <button type="button" onClick={() => setChoice('change')} aria-pressed={picked === 'change'}
                  style={{ ...buttonStyle(picked === 'change' ? 'primary' : 'secondary'), width: '100%' }}>
                  צריך לשנות משהו
                </button>
              </div>
              {picked === 'change' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600, color: C.sub }}>
                  מה צריך לשנות? (למשל: לא אהיה בבית, כתובת אחרת, שעה)
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={500}
                    style={{ ...inputStyle, resize: 'vertical' }} />
                </label>
              )}
              {error && <div role="alert" style={{ color: C.danger }}>{error}</div>}
              <button type="button" onClick={send} disabled={!picked || view.state === 'saving'}
                style={{ ...buttonStyle('primary'), width: '100%' }}>
                {view.state === 'saving' ? 'שולחת...' : 'שליחה'}
              </button>
            </>
          )}

          {view.state === 'done' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: 40 }}>{view.response === 'ok' ? '💐' : '📝'}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>תודה {view.info.firstName}!</div>
              <div style={{ color: C.sub, marginTop: 4 }}>
                {view.response === 'ok'
                  ? 'קיבלנו את האישור שלך. בתיאבון ובשעה טובה!'
                  : 'קיבלנו את הבקשה, ונחזור אלייך בהקדם.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
