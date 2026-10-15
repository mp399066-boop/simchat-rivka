import type { ReactNode } from 'react';
import { colors as C } from '@/lib/theme';

/** A labelled form field. `hint` is a short line under the input. */
export default function Field({ label, hint, required, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600, color: C.sub }}>
      <span>{label}{required && <span style={{ color: C.danger }}> *</span>}</span>
      {children}
      {hint && <span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}>{hint}</span>}
    </label>
  );
}
