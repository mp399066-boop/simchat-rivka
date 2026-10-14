import type { ReactNode } from 'react';
import { colors as C } from '@/lib/theme';

/**
 * Centered message for whole-page states: loading, error, not found, no access.
 * Inline styles only, so it also renders inside app/global-error.tsx, which
 * replaces the root layout.
 */
export default function StatusMessage({ title, text, children, fullPage }: {
  title: string;
  text?: string;
  children?: ReactNode;
  fullPage?: boolean;
}) {
  return (
    <div style={{
      minHeight: fullPage ? '100vh' : 360, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, direction: 'rtl', backgroundColor: fullPage ? C.bg : undefined,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>{title}</div>
        {text && <div style={{ fontSize: 15, color: C.sub, lineHeight: 1.7 }}>{text}</div>}
        {children && (
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
