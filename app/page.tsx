'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useMe } from '@/components/layout/AppShell';
import StatusMessage from '@/components/ui/StatusMessage';
import { formatDate, israelDate } from '@/lib/dates';
import { fullAddress, isOpen, STATUS_COLORS, STATUS_LABELS, type Mother } from '@/lib/mothers';
import { teamNames, useMothers } from '@/lib/useMothers';
import { buttonStyle, colors as C } from '@/lib/theme';

export default function HomePage() {
  const me = useMe();
  const isAdmin = me.role === 'admin';
  const { data, retry } = useMothers(isAdmin);

  const today = israelDate(0);
  const tomorrow = israelDate(1);

  const groups = useMemo(() => {
    const open = data.state === 'ready' ? data.mothers.filter(isOpen) : [];
    return {
      late:        open.filter(m => m.delivery_date && m.delivery_date < today),
      today:       open.filter(m => m.delivery_date === today),
      tomorrow:    open.filter(m => m.delivery_date === tomorrow),
      unscheduled: open.filter(m => !m.delivery_date),
      unassigned:  open.filter(m => m.delivery_date && !m.delivery_volunteer_id),
    };
  }, [data, today, tomorrow]);

  const names = useMemo(() => teamNames(data.state === 'ready' ? data.team : []), [data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>
            שלום{me.fullName ? ` ${me.fullName}` : ''}
          </h1>
          <p style={{ fontSize: 15, color: C.sub, margin: '4px 0 0' }}>{formatDate(today)}</p>
        </div>
        <Link href="/mothers" style={buttonStyle('primary')}>{isAdmin ? 'כל היולדות' : 'כל המשלוחים שלי'}</Link>
      </div>

      {data.state === 'loading' && <StatusMessage title="טוען..." />}
      {data.state === 'error' && (
        <StatusMessage title={data.message} text="כדאי לבדוק את החיבור לאינטרנט.">
          <button onClick={retry} style={buttonStyle('primary')}>נסי שוב</button>
        </StatusMessage>
      )}

      {data.state === 'ready' && (
        <>
          {/* Things that need the manager's attention */}
          {isAdmin && (groups.late.length > 0 || groups.unscheduled.length > 0 || groups.unassigned.length > 0) && (
            <section style={{ ...card, borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }}>
              <h2 style={h2}>דורש טיפול</h2>
              <ul style={{ margin: 0, paddingInlineStart: 20, color: C.text, fontSize: 15, lineHeight: 1.9 }}>
                {groups.late.length > 0 && <li>{groups.late.length} משלוחים שתאריכם עבר ועוד לא סומנו כנמסרו</li>}
                {groups.unscheduled.length > 0 && <li>{groups.unscheduled.length} יולדות בלי תאריך משלוח</li>}
                {groups.unassigned.length > 0 && <li>{groups.unassigned.length} משלוחים בלי מתנדבת שמוסרת</li>}
              </ul>
            </section>
          )}

          <DayList title="היום" mothers={[...groups.late, ...groups.today]} today={today} names={isAdmin ? names : null} />
          <DayList title="מחר" mothers={groups.tomorrow} today={today} names={isAdmin ? names : null} />
        </>
      )}
    </div>
  );
}

function DayList({ title, mothers, today, names }: {
  title: string;
  mothers: Mother[];
  today: string;
  names: Map<string, string> | null;
}) {
  return (
    <section style={card}>
      <h2 style={h2}>{title} <span style={{ color: C.muted, fontWeight: 500 }}>({mothers.length})</span></h2>
      {mothers.length === 0 ? (
        <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>אין משלוחים</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
          {mothers.map((m, i) => {
            const s = STATUS_COLORS[m.delivery_status];
            const late = m.delivery_date !== null && m.delivery_date < today;
            return (
              <li key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                padding: '10px 0', borderTop: i ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
                    {m.full_name}
                    {late && <span style={{ color: C.danger, fontSize: 13, fontWeight: 600 }}> · באיחור ({formatDate(m.delivery_date, false)})</span>}
                  </div>
                  <div style={{ fontSize: 14, color: C.sub }}>
                    {fullAddress(m) || 'אין כתובת'}
                    {names && <> · {m.delivery_volunteer_id ? (names.get(m.delivery_volunteer_id) ?? 'מתנדבת') : <span style={{ color: C.danger }}>לא שובצה</span>}</>}
                  </div>
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                  backgroundColor: s.bg, color: s.text, whiteSpace: 'nowrap',
                }}>
                  {STATUS_LABELS[m.delivery_status]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const card = {
  backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
  padding: 18, boxShadow: C.shadow,
} as const;

const h2 = { fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 10px' } as const;
