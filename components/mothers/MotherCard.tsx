'use client';

import { formatDate, relativeDate } from '@/lib/dates';
import {
  DELIVERY_STATUSES, fullAddress, isOpen, STATUS_COLORS, STATUS_LABELS, telLink, wazeLink,
  type DeliveryStatus, type Mother,
} from '@/lib/mothers';
import { buttonStyle, colors as C, inputStyle } from '@/lib/theme';

/**
 * One mother + her delivery. The manager gets a status picker, edit and
 * delete; a volunteer gets "יצאתי" / "נמסר" buttons only.
 */
export default function MotherCard({ mother: m, volunteerName, isAdmin, busy, onStatus, onEdit, onDelete }: {
  mother: Mother;
  volunteerName?: string | null;
  isAdmin: boolean;
  busy?: boolean;
  onStatus: (status: DeliveryStatus) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const address = fullAddress(m);
  const waze = wazeLink(m);
  const status = STATUS_COLORS[m.delivery_status];

  return (
    <article style={{
      backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16,
      boxShadow: C.shadow, display: 'flex', flexDirection: 'column', gap: 10,
      opacity: isOpen(m) ? 1 : 0.75,
    }}>
      {/* Name, status, date */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>{m.full_name}</h3>
          <div style={{ fontSize: 14, color: C.sub, marginTop: 2 }}>
            {m.delivery_date
              ? <>משלוח: <strong style={{ color: C.text }}>{relativeDate(m.delivery_date)}</strong></>
              : <span style={{ color: C.danger }}>עוד לא נקבע תאריך משלוח</span>}
          </div>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
          backgroundColor: status.bg, color: status.text, whiteSpace: 'nowrap',
        }}>
          {STATUS_LABELS[m.delivery_status]}
        </span>
      </div>

      {/* Contact & address */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 15, color: C.text }}>
        {address && <div>📍 {address}{m.address_notes ? <span style={{ color: C.sub }}> · {m.address_notes}</span> : null}</div>}
        {m.phone && <div dir="ltr" style={{ textAlign: 'right' }}>{m.phone} 📞</div>}
        {m.birth_date && <div style={{ color: C.sub, fontSize: 14 }}>תאריך לידה: {formatDate(m.birth_date, false)}</div>}
        {isAdmin && (
          <div style={{ color: C.sub, fontSize: 14 }}>
            מוסרת: {volunteerName ?? <span style={{ color: C.danger }}>עוד לא שובצה</span>}
          </div>
        )}
        {m.notes && <div style={{ color: C.sub, fontSize: 14, whiteSpace: 'pre-wrap' }}>הערות: {m.notes}</div>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {m.phone && <a href={telLink(m.phone)} style={buttonStyle('secondary')}>חיוג</a>}
        {waze && <a href={waze} target="_blank" rel="noopener noreferrer" style={buttonStyle('secondary')}>ניווט ב-Waze</a>}

        {isAdmin ? (
          <>
            <select
              aria-label="מצב המשלוח"
              value={m.delivery_status}
              disabled={busy}
              onChange={e => onStatus(e.target.value as DeliveryStatus)}
              style={{ ...inputStyle, width: 'auto', minWidth: 140 }}
            >
              {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <button onClick={onEdit} style={buttonStyle('secondary')}>עריכה</button>
            <button onClick={onDelete} style={{ ...buttonStyle('secondary'), color: C.danger }}>מחיקה</button>
          </>
        ) : isOpen(m) && (
          <>
            {m.delivery_status !== 'out' && (
              <button disabled={busy} onClick={() => onStatus('out')} style={buttonStyle('secondary')}>יצאתי למסירה</button>
            )}
            <button disabled={busy} onClick={() => onStatus('delivered')} style={buttonStyle('primary')}>נמסר ✓</button>
          </>
        )}
      </div>
    </article>
  );
}
