import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { URGENCY_LABELS, type Action, type Urgency } from '@/lib/actions';
import { buttonStyle, card, colors as C } from '@/lib/theme';

const TONE: Record<Urgency, { bg: string; fg: string }> = {
  now:   { bg: '#FEE2E2', fg: '#B91C1C' },
  week:  { bg: '#FEF3C7', fg: '#B45309' },
  later: { bg: C.tile,    fg: C.sub },
};

/** The manager's "what needs doing" list, grouped by urgency. */
export default function ActionList({ actions }: { actions: Action[] }) {
  if (!actions.length) {
    return (
      <section style={{ ...card, background: C.successSub, borderColor: '#BBF7D0' }}>
        <h2 style={{ ...h2, color: C.success, margin: 0 }}><Icon name="check" size={20} />הכול משובץ ומסודר ✓</h2>
      </section>
    );
  }
  const groups = (['now', 'week', 'later'] as Urgency[])
    .map(u => ({ urgency: u, items: actions.filter(a => a.urgency === u) }))
    .filter(g => g.items.length);

  return (
    <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ ...h2, margin: 0 }}>
        <Icon name="list" size={20} />מה צריך לעשות
        <span style={{
          marginInlineStart: 'auto', fontSize: 14, fontWeight: 800, padding: '3px 12px', borderRadius: 999,
          backgroundColor: C.accentSub, color: C.accent,
        }}>{actions.length}</span>
      </h2>
      {groups.map(g => (
        <div key={g.urgency}>
          <div style={{ fontSize: 13, fontWeight: 800, color: TONE[g.urgency].fg, marginBottom: 6 }}>
            {URGENCY_LABELS[g.urgency]}
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.items.map(a => (
              <li key={a.key} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 16, backgroundColor: C.tile,
              }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', backgroundColor: TONE[g.urgency].bg, color: TONE[g.urgency].fg,
                }}>
                  <Icon name={a.icon} size={19} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: C.text }}>{a.text}</span>
                  {a.detail && <span style={{ fontSize: 13, color: C.sub }}>{a.detail}</span>}
                </span>
                <Link href={a.href} style={{ ...buttonStyle('secondary'), backgroundColor: '#FFFFFF', minHeight: 40, padding: '6px 14px', fontSize: 14 }}>
                  {a.cta}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

const h2 = { fontSize: 18, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 8 } as const;
