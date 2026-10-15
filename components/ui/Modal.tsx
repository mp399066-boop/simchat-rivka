'use client';

import { useEffect, type FormEvent, type ReactNode } from 'react';
import { colors as C } from '@/lib/theme';

/**
 * Dialog holding a form. Esc / click outside closes it — unless `busy`
 * (while saving), so a half-sent save is never abandoned.
 */
export default function Modal({ title, busy, onClose, onSubmit, children, footer, maxWidth = 480 }: {
  title: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  footer: ReactNode;
  maxWidth?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 12, backgroundColor: 'rgba(42,26,34,0.45)',
      }}
    >
      <form
        onSubmit={e => { e.preventDefault(); onSubmit(e); }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        noValidate
        style={{
          width: '100%', maxWidth, maxHeight: '100%', display: 'flex', flexDirection: 'column',
          backgroundColor: C.card, borderRadius: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          animation: 'fadeIn 0.15s ease-out', overflow: 'hidden',
        }}
      >
        <h2 id="modal-title" style={{
          fontSize: 18, fontWeight: 700, color: C.text, margin: 0, padding: '18px 20px 12px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          {title}
        </h2>
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px 16px', borderTop: `1px solid ${C.border}` }}>
          {footer}
        </div>
      </form>
    </div>
  );
}
