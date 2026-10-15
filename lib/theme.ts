/**
 * Shared design tokens — the single source for the app's colors and the
 * recurring shapes (cards, tiles, buttons, inputs).
 * Pages use inline styles: import { colors as C, card, tile } from '@/lib/theme'.
 * The palette is the berry-pink of the שמחת רבקה logo.
 */
export const colors = {
  bg:        '#FBF5F8',   // page background (a gradient tint is added in globals.css)
  card:      '#FFFFFF',   // card / panel surface
  tile:      '#FAF2F6',   // stat tiles, inactive pills
  border:    '#F2E4EB',   // card borders, dividers
  accent:    '#C8155B',   // brand pink (logo #DD1864, darkened for text contrast)
  accentHov: '#A8114C',   // primary button hover
  accentSub: '#FDEEF4',   // tinted pink background
  accentRim: '#F7C4D8',   // pink border on tinted backgrounds
  deep:      '#5C0A2D',   // dark berry — hero banner, headings on light
  gold:      '#F2A93B',   // small sparkle accents
  text:      '#2A1A22',   // primary text
  sub:       '#7D6873',   // secondary text
  muted:     '#AE9AA4',   // hints, placeholders, meta
  danger:    '#DC2626',   // destructive actions, errors
  dangerSub: '#FEF2F2',
  success:   '#15803D',
  successSub:'#F0FDF4',
  shadow:    '0 10px 30px rgba(110,11,53,0.07)',
} as const;

/** The hero banner gradient (dark berry → logo pink). */
export const heroGradient = 'linear-gradient(115deg, #4A0824 0%, #8E0E46 55%, #D3195F 100%)';

/** A main content card. */
export const card = {
  backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 24,
  padding: 20, boxShadow: colors.shadow,
} as const;

/** A small stat tile inside a card. */
export const tile = {
  backgroundColor: colors.tile, borderRadius: 16, padding: '12px 10px', textAlign: 'center',
  display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0,
} as const;

/** Standard button look. primary = filled pink; danger = filled red; light = white pill on dark. */
export function buttonStyle(kind: 'primary' | 'secondary' | 'danger' | 'light' = 'secondary') {
  const look = {
    primary:   { bg: colors.accent, fg: '#FFFFFF',    border: colors.accent },
    danger:    { bg: colors.danger, fg: '#FFFFFF',    border: colors.danger },
    secondary: { bg: colors.tile,   fg: colors.text,  border: colors.tile },
    light:     { bg: '#FFFFFF',     fg: colors.deep,  border: '#FFFFFF' },
  }[kind];
  return {
    minHeight: 44, padding: '10px 18px', borderRadius: 999, fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    border: `1px solid ${look.border}`, backgroundColor: look.bg, color: look.fg,
    boxShadow: kind === 'light' ? '0 8px 24px rgba(0,0,0,0.18)' : kind === 'primary' ? '0 6px 16px rgba(200,21,91,0.25)' : 'none',
  } as const;
}

/** Standard text input / select look (16px font keeps iOS from zooming in). */
export const inputStyle = {
  width: '100%', minHeight: 46, padding: '10px 14px', borderRadius: 14,
  border: `1px solid ${colors.border}`, backgroundColor: '#FFFFFF', color: colors.text,
  fontSize: 16, fontFamily: 'inherit',
} as const;
