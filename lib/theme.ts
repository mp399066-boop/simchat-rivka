/**
 * Shared design tokens — the single source for the app's colors.
 * Pages use inline styles: import { colors as C } from '@/lib/theme'.
 * The accent is the pink of the שמחת רבקה logo.
 */
export const colors = {
  bg:        '#FBF7F9',   // page background
  card:      '#FFFFFF',   // card / panel surface
  border:    '#EFE6EA',   // card borders, dividers
  accent:    '#C8155B',   // brand pink (logo #DD1864, darkened for text contrast)
  accentHov: '#A8114C',   // primary button hover
  accentSub: '#FDF0F5',   // tinted pink background
  accentRim: '#F7C4D8',   // pink border on tinted backgrounds
  text:      '#2A1A22',   // primary text
  sub:       '#6B5A63',   // secondary text
  muted:     '#A3949B',   // hints, placeholders, meta
  danger:    '#DC2626',   // destructive actions, errors
  dangerSub: '#FEF2F2',
  success:   '#15803D',
  successSub:'#F0FDF4',
  shadow:    '0 1px 4px rgba(60,20,40,0.06)',
} as const;

/** Standard button look. primary = filled pink; danger = filled red. */
export function buttonStyle(kind: 'primary' | 'secondary' | 'danger' = 'secondary') {
  const filled = kind !== 'secondary';
  const bg = kind === 'primary' ? colors.accent : kind === 'danger' ? colors.danger : colors.card;
  return {
    minHeight: 44, padding: '10px 18px', borderRadius: 10, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    border: filled ? `1px solid ${bg}` : `1px solid ${colors.border}`,
    backgroundColor: bg,
    color: filled ? '#FFFFFF' : colors.text,
  } as const;
}

/** Standard text input / select look (16px font keeps iOS from zooming in). */
export const inputStyle = {
  width: '100%', minHeight: 44, padding: '10px 12px', borderRadius: 10,
  border: `1px solid ${colors.border}`, backgroundColor: colors.card, color: colors.text,
  fontSize: 16, fontFamily: 'inherit',
} as const;
