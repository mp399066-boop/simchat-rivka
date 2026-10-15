'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useMe } from '@/components/layout/AppShell';
import Icon, { type IconName } from '@/components/ui/Icon';
import PageHero from '@/components/ui/PageHero';
import StatusMessage from '@/components/ui/StatusMessage';
import { gregorianDate, hebrewDate, israelDate, weekday } from '@/lib/dates';
import { fullAddress, isOpen, STATUS_COLORS, STATUS_LABELS, type Mother } from '@/lib/mothers';
import { teamNames, useMothers } from '@/lib/useMothers';
import { buttonStyle, card, colors as C } from '@/lib/theme';

export default function HomePage() {
  const me = useMe();
  const isAdmin = me.role === 'admin';
  const { data, retry } = useMothers(isAdmin);

  const today = israelDate(0);
  const tomorrow = israelDate(1);

  const groups = useMemo(() => {
    const open = data.state === 'ready' ? data.mothers.filter(isOpen) : [];
    return {
      open,
      late:        open.filter(m => m.delivery_date && m.delivery_date < today),
      today:       open.filter(m => m.delivery_date === today),
      tomorrow:    open.filter(m => m.delivery_date === tomorrow),
      unscheduled: open.filter(m => !m.delivery_date),
      unassigned:  open.filter(m => m.delivery_date && !m.delivery_volunteer_id),
    };
  }, [data, today, tomorrow]);

  const names = useMemo(() => teamNames(data.state === 'ready' ? data.team : []), [data]);
  const attention = groups.late.length + groups.unscheduled.length + groups.unassigned.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero
        title={`שלום${me.fullName ? ` ${me.fullName}` : ''}`}
        subtitle={`יום ${weekday(today)} · ${hebrewDate(today, true)} · ${gregorianDate(today)}`}
        action={
          <Link href="/mothers" style={buttonStyle('light')}>
            <Icon name="heart" size={18} />{isAdmin ? 'כל היולדות' : 'המשלוחים שלי'}
          </Link>
        }
      />

      {data.state === 'loading' && <StatusMessage title="טוען..." />}
      {data.state === 'error' && (
        <StatusMessage title={data.message} text="כדאי לבדוק את החיבור לאינטרנט.">
          <button onClick={retry} style={buttonStyle('primary')}>נסי שוב</button>
        </StatusMessage>
      )}

      {data.state === 'ready' && (
        <>
          {/* Numbers at a glance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <Stat icon="truck"    label="יוצאים היום" value={groups.today.length + groups.late.length} />
            <Stat icon="calendar" label="מחר"         value={groups.tomorrow.length} />
            <Stat icon="heart"    label="לטיפול"      value={groups.open.length} />
            {isAdmin && <Stat icon="alert" label="דורש טיפול" value={attention} warn={attention > 0} />}
          </div>

          {/* What needs the manager's attention */}
          {isAdmin && attention > 0 && (
            <section style={{ ...card, background: '#FFFBEB', borderColor: '#FDE68A' }}>
              <h2 style={{ ...h2, color: '#92400E' }}><Icon name="alert" size={20} />דורש טיפול</h2>
              <ul style={{ margin: 0, paddingInlineStart: 20, color: C.text, fontSize: 15, lineHeight: 1.9 }}>
                {groups.late.length > 0 && <li>{groups.late.length} משלוחים שתאריכם עבר ועוד לא סומנו כנמסרו</li>}
                {groups.unscheduled.length > 0 && <li>{groups.unscheduled.length} יולדות בלי תאריך משלוח</li>}
                {groups.unassigned.length > 0 && <li>{groups.unassigned.length} משלוחים בלי מתנדבת שמוסרת</li>}
              </ul>
            </section>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: 16 }}>
            <DayList title="היום" date={today} mothers={[...groups.late, ...groups.today]} today={today} names={isAdmin ? names : null} />
            <DayList title="מחר" date={tomorrow} mothers={groups.tomorrow} today={today} names={isAdmin ? names : null} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, warn }: { icon: IconName; label: string; value: number; warn?: boolean }) {
  return (
    <div style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        width: 46, height: 46, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: warn ? '#FEF3C7' : C.accentSub, color: warn ? '#B45309' : C.accent,
      }}>
        <Icon name={icon} size={22} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{value}</span>
        <span style={{ fontSize: 13, color: C.sub }}>{label}</span>
      </span>
    </div>
  );
}

function DayList({ title, date, mothers, today, names }: {
  title: string;
  date: string;
  mothers: Mother[];
  today: string;
  names: Map<string, string> | null;
}) {
  return (
    <section style={card}>
      <h2 style={h2}>
        {title}
        <span style={{ fontSize: 14, fontWeight: 500, color: C.sub }}>{hebrewDate(date)} · {gregorianDate(date)}</span>
        <span style={{
          marginInlineStart: 'auto', fontSize: 14, fontWeight: 800, padding: '3px 12px', borderRadius: 999,
          backgroundColor: C.accentSub, color: C.accent,
        }}>{mothers.length}</span>
      </h2>
      {mothers.length === 0 ? (
        <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>אין משלוחים</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mothers.map(m => {
            const s = STATUS_COLORS[m.delivery_status];
            const late = m.delivery_date !== null && m.delivery_date < today;
            return (
              <li key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '10px 12px', borderRadius: 16, backgroundColor: C.tile,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                    {m.full_name}
                    {late && m.delivery_date && (
                      <span style={{ color: C.danger, fontSize: 13 }}> · באיחור ({hebrewDate(m.delivery_date)})</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: C.sub }}>
                    {fullAddress(m) || 'אין כתובת'}
                    {names && <> · {m.delivery_volunteer_id
                      ? (names.get(m.delivery_volunteer_id) ?? 'מתנדבת')
                      : <span style={{ color: C.danger }}>לא שובצה</span>}</>}
                  </div>
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 999, flexShrink: 0,
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

const h2 = {
  fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 12px',
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
} as const;
