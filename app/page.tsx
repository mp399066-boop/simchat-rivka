'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMe } from '@/components/layout/AppShell';
import ActionList from '@/components/home/ActionList';
import StatusBoard from '@/components/home/StatusBoard';
import TodoList from '@/components/menu/TodoList';
import PrepDialog from '@/components/prep/PrepDialog';
import { useFeedback } from '@/components/ui/Feedback';
import Icon, { type IconName } from '@/components/ui/Icon';
import PageHero from '@/components/ui/PageHero';
import StatusMessage from '@/components/ui/StatusMessage';
import { computeActions } from '@/lib/actions';
import { gregorianDate, hebrewDate, israelDate, weekday } from '@/lib/dates';
import { todoLists, type MenuItem } from '@/lib/menu';
import { loadMenu } from '@/lib/menuData';
import { setDeliveryStatus } from '@/lib/mothersData';
import { isOpen, type DeliveryStatus, type Mother } from '@/lib/mothers';
import { prepProgress, useMothers } from '@/lib/useMothers';
import { buttonStyle, card, colors as C } from '@/lib/theme';

/**
 * The manager's day: what needs doing, where every meal stands (with a
 * one-tap next step), and what to take out / make / buy.
 */
export default function HomePage() {
  const me = useMe();
  const isAdmin = me.role === 'admin';
  const { toast } = useFeedback();
  const { data, reload, retry } = useMothers(isAdmin);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [prepFor, setPrepFor] = useState<Mother | null>(null);

  // The menu (for the to-do list) — the list is simply hidden if it fails to load.
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    loadMenu().then(r => { if (!cancelled) setMenu(r.data); });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const today = israelDate(0);
  const tomorrow = israelDate(1);

  const counts = useMemo(() => {
    const open = data.state === 'ready' ? data.mothers.filter(isOpen) : [];
    return {
      today: open.filter(m => m.delivery_date && m.delivery_date <= today).length,
      tomorrow: open.filter(m => m.delivery_date === tomorrow).length,
      open: open.length,
    };
  }, [data, today, tomorrow]);

  const todo = useMemo(
    () => (menu?.length && data.state === 'ready' ? todoLists(menu, data.mothers, 'week') : null),
    [menu, data],
  );
  const progress = useMemo(() => prepProgress(data.state === 'ready' ? data.prep : []), [data]);
  const actions = useMemo(
    () => (isAdmin && data.state === 'ready' ? computeActions({ mothers: data.mothers, today }) : []),
    [isAdmin, data, today],
  );

  async function next(m: Mother, status: DeliveryStatus) {
    setBusyId(m.id);
    const { error } = await setDeliveryStatus(m.id, status);
    if (error) toast.error(error);
    else {
      toast.success(status === 'delivered' ? `נמסר ל${m.full_name} ✓` : 'עודכן');
      await reload();
    }
    setBusyId(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero
        title={`שלום${me.fullName ? ` ${me.fullName}` : ''}`}
        subtitle={`יום ${weekday(today)} · ${hebrewDate(today, true)} · ${gregorianDate(today)}`}
        action={
          <span style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            <Link href="/mothers" style={buttonStyle('light')}>
              <Icon name="plus" size={18} />יולדת חדשה / כל היולדות
            </Link>
            <Link href="/guide" style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 700, textDecoration: 'underline', paddingInlineStart: 6 }}>
              איך עובדים עם המערכת?
            </Link>
          </span>
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
            <Stat icon="truck"    label="יוצאים היום" value={counts.today} />
            <Stat icon="calendar" label="מחר"         value={counts.tomorrow} />
            <Stat icon="heart"    label="עוד לא נמסרו" value={counts.open} />
            {isAdmin && <Stat icon="alert" label="דורש טיפול" value={actions.length} warn={actions.length > 0} />}
          </div>

          {/* What needs doing — one line per open problem */}
          {isAdmin && actions.length > 0 && <ActionList actions={actions} />}

          {/* Where every meal stands, with the next step */}
          <StatusBoard
            mothers={data.mothers}
            progress={progress}
            today={today}
            busyId={busyId}
            onNext={next}
            onPrep={m => setPrepFor(m)}
          />

          {/* What to take out of the freezer, make and buy */}
          {isAdmin && todo && (
            <TodoList
              lists={todo}
              until="לשבוע הקרוב"
              action={<Link href="/menu" style={buttonStyle('secondary')}>לתפריט ולמלאי</Link>}
            />
          )}
        </>
      )}

      {prepFor && data.state === 'ready' && (
        <PrepDialog mother={prepFor} team={data.team} onClose={() => { setPrepFor(null); reload(); }} />
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
