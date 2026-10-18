'use client';

import { useMemo, useState } from 'react';
import { useMe } from '@/components/layout/AppShell';
import DateInput from '@/components/ui/DateInput';
import Icon from '@/components/ui/Icon';
import StatusMessage from '@/components/ui/StatusMessage';
import { infoOf } from '@/lib/categories';
import { fullDate, israelDate } from '@/lib/dates';
import { fullAddress, isOpen, STATUS_LABELS } from '@/lib/mothers';
import { teamNames, useMothers } from '@/lib/useMothers';
import { buttonStyle, card, colors as C } from '@/lib/theme';

/**
 * A printable delivery sheet for one day — for volunteers who work from
 * paper (or a kosher phone) rather than the app.
 */
export default function PrintPage() {
  const me = useMe();
  const isAdmin = me.role === 'admin';
  const { data, retry } = useMothers(isAdmin);
  const [date, setDate] = useState(() => israelDate(1));

  const rows = useMemo(() => (data.state === 'ready'
    ? data.mothers.filter(m => isOpen(m) && m.delivery_date === date).sort((a, b) =>
        (a.city ?? '').localeCompare(b.city ?? '', 'he') || (a.address ?? '').localeCompare(b.address ?? '', 'he'))
    : []), [data, date]);
  const names = useMemo(() => teamNames(data.state === 'ready' ? data.team : []), [data]);

  const th = { textAlign: 'right', padding: '8px 6px', borderBottom: `2px solid ${C.text}`, fontSize: 13 } as const;
  const td = { padding: '10px 6px', borderBottom: `1px solid ${C.border}`, fontSize: 14, verticalAlign: 'top' } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls (not printed) */}
      <section className="no-print" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>דף משלוחים להדפסה</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setDate(israelDate(0))} style={buttonStyle(date === israelDate(0) ? 'primary' : 'secondary')}>היום</button>
          <button onClick={() => setDate(israelDate(1))} style={buttonStyle(date === israelDate(1) ? 'primary' : 'secondary')}>מחר</button>
        </div>
        <div style={{ maxWidth: 420 }}>
          <DateInput key={date} label="תאריך" value={date} onChange={d => d && setDate(d)} />
        </div>
        <button onClick={() => window.print()} disabled={!rows.length} style={{ ...buttonStyle('primary'), alignSelf: 'flex-start' }}>
          <Icon name="printer" size={18} />הדפסה
        </button>
      </section>

      {data.state === 'loading' && <StatusMessage title="טוען..." />}
      {data.state === 'error' && (
        <StatusMessage title={data.message}>
          <button onClick={retry} style={buttonStyle('primary')}>נסי שוב</button>
        </StatusMessage>
      )}

      {data.state === 'ready' && (
        <section style={{ ...card, padding: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: C.text }}>
            משלוחי ארוחות – {fullDate(date)}
          </h2>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: C.sub }}>ארגון שמחת רבקה · {rows.length} משלוחים</p>
          {rows.length === 0 ? (
            <p style={{ margin: 0, color: C.muted }}>אין משלוחים ביום הזה</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 28 }}>✓</th>
                    <th style={th}>שם</th>
                    <th style={th}>כתובת</th>
                    <th style={th}>טלפון</th>
                    {isAdmin && <th style={th}>מוסרת</th>}
                    <th style={th}>הערות</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(m => (
                    <tr key={m.id}>
                      <td style={td}><span style={{ display: 'inline-block', width: 18, height: 18, border: `1.5px solid ${C.text}`, borderRadius: 4 }} /></td>
                      <td style={{ ...td, fontWeight: 700 }}>
                        {m.full_name}
                        <div style={{ fontWeight: 400, fontSize: 12, color: C.sub }}>
                          {infoOf(m).id === 'birth' ? '' : `${m.occasion || infoOf(m).one} · `}{STATUS_LABELS[m.delivery_status]}
                        </div>
                      </td>
                      <td style={td}>
                        {fullAddress(m) || '—'}
                        {m.address_notes && <div style={{ fontSize: 12, color: C.sub }}>{m.address_notes}</div>}
                      </td>
                      <td style={td}><span dir="ltr">{m.phone ?? '—'}</span></td>
                      {isAdmin && <td style={td}>{m.delivery_volunteer_id ? names.get(m.delivery_volunteer_id) ?? '' : '—'}</td>}
                      <td style={td}>{m.notes ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
