'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useMe } from '@/components/layout/AppShell';
import { useFeedback } from '@/components/ui/Feedback';
import Icon from '@/components/ui/Icon';
import PageHero from '@/components/ui/PageHero';
import StatusMessage from '@/components/ui/StatusMessage';
import MotherCard from '@/components/mothers/MotherCard';
import MotherForm from '@/components/mothers/MotherForm';
import PrepDialog from '@/components/prep/PrepDialog';
import { deleteMother, saveMother, setDeliveryStatus } from '@/lib/mothersData';
import { isOpen, type DeliveryStatus, type Mother, type MotherInput } from '@/lib/mothers';
import { prepProgress, teamNames, useMothers } from '@/lib/useMothers';
import { authFetch } from '@/lib/supabase';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

type Tab = 'open' | 'done' | 'all';
const TABS: { id: Tab; label: string }[] = [
  { id: 'open', label: 'לטיפול' },
  { id: 'done', label: 'נמסרו / בוטלו' },
  { id: 'all',  label: 'הכול' },
];

/** Open deliveries: soonest first, unscheduled last. Done: most recent first. */
/** ?q=<name> in the address (links from the home page's action list). */
const noSubscribe = () => () => {};
const readQuery = () => new URLSearchParams(window.location.search).get('q') ?? '';

function sortFor(tab: Tab) {
  return (a: Mother, b: Mother) => {
    const da = a.delivery_date ?? '9999-12-31';
    const db = b.delivery_date ?? '9999-12-31';
    const byDate = tab === 'done' ? db.localeCompare(da) : da.localeCompare(db);
    return byDate || a.full_name.localeCompare(b.full_name, 'he');
  };
}

export default function MothersPage() {
  const me = useMe();
  const isAdmin = me.role === 'admin';
  const { confirm, toast } = useFeedback();
  const { data, reload, retry } = useMothers(isAdmin);
  const [tab, setTab] = useState<Tab>('open');
  const urlQuery = useSyncExternalStore(noSubscribe, readQuery, () => '');
  // null = untouched: then the search comes from the link.
  const [typed, setSearch] = useState<string | null>(null);
  const search = typed ?? urlQuery;
  const [editing, setEditing] = useState<Mother | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [prepFor, setPrepFor] = useState<Mother | null>(null);

  const mothers = useMemo(() => (data.state === 'ready' ? data.mothers : []), [data]);
  const names = useMemo(() => teamNames(data.state === 'ready' ? data.team : []), [data]);
  const progress = useMemo(() => prepProgress(data.state === 'ready' ? data.prep : []), [data]);

  const counts = useMemo(() => ({
    open: mothers.filter(isOpen).length,
    done: mothers.filter(m => !isOpen(m)).length,
    all:  mothers.length,
  }), [mothers]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return mothers
      .filter(m => tab === 'all' || (tab === 'open' ? isOpen(m) : !isOpen(m)))
      .filter(m => !q
        || [m.full_name, m.city, m.address].some(v => v?.toLowerCase().includes(q))
        || (digits.length >= 3 && m.phone?.replace(/\D/g, '').includes(digits)))
      .sort(sortFor(tab));
  }, [mothers, tab, search]);

  async function save(input: MotherInput): Promise<boolean> {
    const id = editing && editing !== 'new' ? editing.id : null;
    const { error } = await saveMother(id, input);
    if (error) { toast.error(error); return false; }
    toast.success(id ? 'הפרטים נשמרו' : 'היולדת נוספה');
    await reload();
    return true;
  }

  async function changeStatus(m: Mother, status: DeliveryStatus) {
    setBusyId(m.id);
    const { error } = await setDeliveryStatus(m.id, status);
    if (error) toast.error(error);
    else {
      toast.success(status === 'delivered' ? 'סומן שנמסר. תודה!' : 'המצב עודכן');
      await reload();
    }
    setBusyId(null);
  }

  async function remind(m: Mother) {
    const ok = await confirm({
      title: 'שליחת תזכורת', confirmLabel: 'שליחה', danger: false,
      message: `לשלוח עכשיו ל${m.full_name} מייל תזכורת עם כפתור אישור?`,
    });
    if (!ok) return;
    setBusyId(m.id);
    try {
      const res = await authFetch('/api/reminders/send', { method: 'POST', body: JSON.stringify({ motherId: m.id }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok) { toast.success('התזכורת נשלחה'); await reload(); }
      else toast.error(typeof body.error === 'string' && res.status !== 401 ? body.error : 'השליחה נכשלה');
    } catch {
      toast.error('אין חיבור לאינטרנט');
    }
    setBusyId(null);
  }

  async function remove(m: Mother) {
    const ok = await confirm({ message: `למחוק את ${m.full_name} ואת פרטי המשלוח שלה? אי אפשר לשחזר.` });
    if (!ok) return;
    const { error } = await deleteMother(m.id);
    if (error) { toast.error(error); return; }
    toast.success('נמחקה');
    await reload();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero
        title={isAdmin ? 'יולדות ומשלוחים' : 'המשלוחים שלי'}
        subtitle={isAdmin
          ? 'כל היולדות, תאריכי המשלוח ומי מוסרת – במקום אחד'
          : 'היולדות שאת מוסרת להן. אחרי המסירה לחצי "נמסר"'}
        action={isAdmin && (
          <button onClick={() => setEditing('new')} style={buttonStyle('light')}>
            <Icon name="plus" size={18} />יולדת חדשה
          </button>
        )}
      />

      {/* Tabs + search */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div role="tablist" style={{
          display: 'flex', gap: 4, backgroundColor: C.card, padding: 5, borderRadius: 999,
          border: `1px solid ${C.border}`, boxShadow: C.shadow, maxWidth: '100%', overflowX: 'auto',
        }}>
          {TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} style={{
              minHeight: 40, padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
              backgroundColor: tab === t.id ? C.accent : 'transparent',
              color: tab === t.id ? '#FFFFFF' : C.sub,
            }}>
              {t.label} ({counts[t.id]})
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, display: 'flex' }}>
            <Icon name="search" size={18} />
          </span>
          <input
            type="search" placeholder="חיפוש לפי שם, טלפון או עיר" value={search}
            onChange={e => setSearch(e.target.value)} aria-label="חיפוש"
            style={{ ...inputStyle, borderRadius: 999, paddingRight: 42, boxShadow: C.shadow }}
          />
        </div>
      </div>

      {data.state === 'loading' && <StatusMessage title="טוען..." />}
      {data.state === 'error' && (
        <StatusMessage title={data.message} text="כדאי לבדוק את החיבור לאינטרנט.">
          <button onClick={retry} style={buttonStyle('primary')}>נסי שוב</button>
        </StatusMessage>
      )}
      {data.state === 'ready' && visible.length === 0 && (
        <StatusMessage
          title={search ? 'לא נמצאו תוצאות' : tab === 'open' ? 'אין משלוחים לטיפול' : 'אין כאן עדיין כלום'}
          text={search ? 'נסי לחפש במילים אחרות.'
            : isAdmin ? (mothers.length === 0 ? "לחצי על '+ יולדת חדשה' כדי להוסיף את הראשונה." : undefined)
            : 'כשהמנהלת תשבץ אותך למשלוח, הוא יופיע כאן.'}
        />
      )}

      {visible.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 440px), 1fr))', gap: 16 }}>
          {visible.map(m => (
            <MotherCard
              key={m.id}
              mother={m}
              isAdmin={isAdmin}
              volunteerName={m.delivery_volunteer_id ? (names.get(m.delivery_volunteer_id) ?? 'מתנדבת') : null}
              busy={busyId === m.id}
              onStatus={s => changeStatus(m, s)}
              onEdit={() => setEditing(m)}
              onDelete={() => remove(m)}
              prep={isAdmin ? progress.get(m.id) : undefined}
              onPrep={isAdmin ? () => setPrepFor(m) : undefined}
              onRemind={isAdmin ? () => remind(m) : undefined}
            />
          ))}
        </div>
      )}

      {prepFor && data.state === 'ready' && (
        <PrepDialog mother={prepFor} team={data.team} onClose={() => { setPrepFor(null); reload(); }} />
      )}

      {editing && data.state === 'ready' && (
        <MotherForm
          mother={editing === 'new' ? undefined : editing}
          team={data.team}
          others={data.mothers}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
