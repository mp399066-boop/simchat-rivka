'use client';

/**
 * In-app replacements for the browser's alert() / confirm():
 *
 *   const { confirm, toast } = useFeedback();
 *   if (!(await confirm({ message: 'למחוק?' }))) return;
 *   toast.error('השמירה נכשלה');   toast.success('נשמר');
 *
 * The native dialogs block the tab, can't be styled and mix RTL/LTR badly.
 */

import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { buttonStyle, colors as C } from '@/lib/theme';

interface ConfirmOptions {
  message: string;
  title?: string;
  /** Text of the confirming button. Default: 'מחיקה'. */
  confirmLabel?: string;
  /** Red confirm button (destructive action). Default: true. */
  danger?: boolean;
}

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; text: string }

interface FeedbackApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  toast: Record<ToastKind, (text: string) => void>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}

const TOAST_MS = 4500;
const TOAST_COLORS: Record<ToastKind, { bg: string; border: string; text: string }> = {
  success: { bg: C.successSub, border: '#BBF7D0', text: '#166534' },
  error:   { bg: C.dangerSub,  border: '#FECACA', text: '#991B1B' },
  info:    { bg: C.card,       border: C.border,  text: C.text },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const confirm = useCallback((opts: ConfirmOptions) =>
    new Promise<boolean>(resolve => setDialog({ ...opts, resolve })), []);

  const close = useCallback((ok: boolean) => {
    setDialog(d => { d?.resolve(ok); return null; });
  }, []);

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = nextId.current++;
    setToasts(t => [...t, { id, kind, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), TOAST_MS);
  }, []);

  const [api] = useState<FeedbackApi>(() => ({
    confirm,
    toast: {
      success: text => push('success', text),
      error:   text => push('error', text),
      info:    text => push('info', text),
    },
  }));

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
      <div
        aria-live="polite"
        style={{
          position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 70, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
        }}
      >
        {toasts.map(t => {
          const c = TOAST_COLORS[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              onClick={() => setToasts(all => all.filter(x => x.id !== t.id))}
              style={{
                pointerEvents: 'auto', direction: 'rtl', width: '100%', maxWidth: 380, padding: '12px 16px',
                borderRadius: 10, border: `1px solid ${c.border}`, backgroundColor: c.bg, color: c.text,
                fontSize: 15, fontWeight: 500, lineHeight: 1.5, cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(42,26,34,0.12)', animation: 'fadeIn 0.15s ease-out',
              }}
            >
              {t.text}
            </div>
          );
        })}
      </div>
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({ title, message, confirmLabel = 'מחיקה', danger = true, onClose }:
  ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef     = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Destructive → focus "ביטול" so a stray Enter doesn't delete anything.
    (danger ? cancelRef : okRef).current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [danger, onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(false); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16,
        backgroundColor: 'rgba(42,26,34,0.45)', backdropFilter: 'blur(3px)',
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        style={{
          direction: 'rtl', width: '100%', maxWidth: 400, backgroundColor: C.card,
          borderRadius: 14, border: `1px solid ${C.border}`, padding: '22px 24px 18px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)', animation: 'fadeIn 0.15s ease-out',
        }}
      >
        <h2 id="confirm-title" style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
          {title ?? (danger ? 'אישור מחיקה' : 'אישור')}
        </h2>
        <p id="confirm-message" style={{ fontSize: 15, color: C.sub, lineHeight: 1.6, margin: 0 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start', marginTop: 20 }}>
          <button ref={okRef} onClick={() => onClose(true)} style={buttonStyle(danger ? 'danger' : 'primary')}>
            {confirmLabel}
          </button>
          <button ref={cancelRef} onClick={() => onClose(false)} style={buttonStyle('secondary')}>ביטול</button>
        </div>
      </div>
    </div>
  );
}
