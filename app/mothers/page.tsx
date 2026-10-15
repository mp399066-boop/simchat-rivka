'use client';

import { useMemo, useState } from 'react';
import { useMe } from '@/components/layout/AppShell';
import { useFeedback } from '@/components/ui/Feedback';
import StatusMessage from '@/components/ui/StatusMessage';
import MotherCard from '@/components/mothers/MotherCard';
import MotherForm from '@/components/mothers/MotherForm';
import { deleteMother, saveMother, setDeliveryStatus } from '@/lib/mothersData';
import { isOpen, type DeliveryStatus, type Mother, type MotherInput } from '@/lib/mothers';
import { teamNames, useMothers } from '@/lib/useMothers';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

type Tab = 'open' | 'done' | 'all';
const TABS: { id: Tab; label: string }[] = [
  { id: 'open', label: 'לטיפול' },
  { id: 'done', label: 'נמסרו / בוטלו' },
  { id: 'all',  label: 'הכול' },
];

/** Open deliveries: soonest first, unscheduled last. Done: most recent first. */
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
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Mother | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const mothers = useMemo(() => (data.state === 'ready' ? data.mothers : []), [data]);
  const names = useMemo(() => teamNames(data.state === 'ready' ? data.team : []), [data]);

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

  async function remove(m: Mother) {
    const ok = await confirm({ message: `למחוק את ${m.full_name} ואת פרטי המשלוח שלה? אי אפשר לשחזר.` });
    if (!ok) return;
    const { error } = await deleteMother(m.id);
    if (error) { toast.error(error); return; }
    toast.success('נמחקה');
    await reload();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>
          {isAdmin ? 'יולדות ומשלוחים' : 'המשלוחים שלי'}
        </h1>
        {isAdmin && <button onClick={() => setEditing('new')} style={buttonStyle('primary')}>+ יולדת חדשה</button>}
      </div>

      {/* Tabs + search */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div role="tablist" style={{ display: 'flex', gap: 4, backgroundColor: '#F3EDF0', padding: 4, borderRadius: 12 }}>
          {TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} style={{
              minHeight: 40, padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
              backgroundColor: tab === t.id ? C.card : 'transparent',
              color: tab === t.id ? C.accent : C.sub,
              boxShadow: tab === t.id ? C.shadow : 'none',
            }}>
              {t.label} ({counts[t.id]})
            </button>
          ))}
        </div>
        <input
          type="search" placeholder="חיפוש לפי שם, טלפון או עיר" value={search}
          onChange={e => setSearch(e.target.value)} aria-label="חיפוש"
          style={{ ...inputStyle, flex: '1 1 220px', width: 'auto' }}
        />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', gap: 12 }}>
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
            />
          ))}
        </div>
      )}

      {editing && data.state === 'ready' && (
        <MotherForm
          mother={editing === 'new' ? undefined : editing}
          team={data.team}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
