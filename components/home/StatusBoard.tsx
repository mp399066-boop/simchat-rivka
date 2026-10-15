import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { gregorianDate, hebrewDate, relativeDay, shiftDate } from '@/lib/dates';
import {
  confirmationLabel, isOpen, nextStatus, STATUS_COLORS, STATUS_LABELS, type DeliveryStatus, type Mother,
} from '@/lib/mothers';
import { buttonStyle, card, colors as C } from '@/lib/theme';

/**
 * Where every meal stands — the manager's main view. Open deliveries grouped
 * by day; each line shows the step, the confirmation, how much of the meal is
 * ready, and a button for the next step.
 */
export default function StatusBoard({ mothers, progress, today, busyId, onNext, onPrep }: {
  mothers: Mother[];
  progress: Map<string, { done: number; total: number }>;
  today: string;
  busyId: string | null;
  onNext: (m: Mother, status: DeliveryStatus) => void;
  onPrep: (m: Mother) => void;
}) {
  const tomorrow = shiftDate(today, 1);
  const weekEnd = shiftDate(today, 6);
  const open = mothers.filter(isOpen)
    .sort((a, b) => (a.delivery_date ?? '9999').localeCompare(b.delivery_date ?? '9999') || a.full_name.localeCompare(b.full_name, 'he'));

  const groups: { title: string; rows: Mother[]; tone?: 'late' }[] = [
    { title: 'באיחור – התאריך עבר', rows: open.filter(m => m.delivery_date && m.delivery_date < today), tone: 'late' as const },
    { title: `היום · ${hebrewDate(today)}`, rows: open.filter(m => m.delivery_date === today) },
    { title: `מחר · ${hebrewDate(tomorrow)}`, rows: open.filter(m => m.delivery_date === tomorrow) },
    { title: 'השבוע', rows: open.filter(m => m.delivery_date && m.delivery_date > tomorrow && m.delivery_date <= weekEnd) },
    { title: 'בהמשך', rows: open.filter(m => m.delivery_date && m.delivery_date > weekEnd) },
    { title: 'בלי תאריך משלוח', rows: open.filter(m => !m.delivery_date) },
  ].filter(g => g.rows.length);

  return (
    <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="truck" size={20} />איפה כל ארוחה עומדת
        <span style={{
          marginInlineStart: 'auto', fontSize: 14, fontWeight: 800, padding: '3px 12px', borderRadius: 999,
          backgroundColor: C.accentSub, color: C.accent,
        }}>{open.length} עוד לא נמסרו</span>
      </h2>

      {open.length === 0 && <p style={{ margin: 0, color: C.muted }}>כל הארוחות נמסרו ✓</p>}

      {groups.map(g => (
        <div key={g.title}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6, color: g.tone === 'late' ? C.danger : C.sub }}>
            {g.title} ({g.rows.length})
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.rows.map(m => {
              const s = STATUS_COLORS[m.delivery_status];
              const next = m.delivery_date ? nextStatus(m.delivery_status) : null;   // no date yet: nothing to pack
              const p = progress.get(m.id);
              const conf = confirmationLabel(m);
              return (
                <li key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  padding: '10px 12px', borderRadius: 16, backgroundColor: C.tile,
                }}>
                  <Link href={`/mothers?q=${encodeURIComponent(m.full_name)}`} style={{ flex: '1 1 200px', minWidth: 0, textDecoration: 'none' }}>
                    <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: C.text }}>{m.full_name}</span>
                    <span style={{ fontSize: 13, color: C.sub }}>
                      {m.delivery_date ? `${relativeDay(m.delivery_date)} · ${gregorianDate(m.delivery_date)}` : 'לקבוע תאריך'}
                      {conf && <> · <span style={{ color: conf.tone === 'ok' ? C.success : conf.tone === 'warn' ? '#B45309' : C.sub }}>{conf.text}</span></>}
                    </span>
                  </Link>
                  <span style={{
                    fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 999,
                    backgroundColor: s.bg, color: s.text, whiteSpace: 'nowrap',
                  }}>{STATUS_LABELS[m.delivery_status]}</span>
                  <button onClick={() => onPrep(m)} title="מה מוכן לארוחה" style={{
                    ...buttonStyle('secondary'), minHeight: 38, padding: '4px 12px', fontSize: 14, backgroundColor: '#FFFFFF',
                    color: p && p.total && p.done === p.total ? C.success : C.text,
                  }}>
                    {p?.total ? `מוכן ${p.done}/${p.total}` : 'מה מוכן'}
                  </button>
                  {next && (
                    <button disabled={busyId === m.id} onClick={() => onNext(m, next.status)}
                      style={{ ...buttonStyle('primary'), minHeight: 38, padding: '4px 14px', fontSize: 14 }}>
                      {next.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
