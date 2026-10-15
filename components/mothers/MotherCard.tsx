'use client';

import type { ReactNode } from 'react';
import Icon from '@/components/ui/Icon';
import { gregorianDate, hebrewDate, relativeDay } from '@/lib/dates';
import {
  DELIVERY_STATUSES, fullAddress, isOpen, STATUS_COLORS, STATUS_LABELS, telLink, wazeLink,
  type DeliveryStatus, type Mother,
} from '@/lib/mothers';
import { buttonStyle, card, colors as C, inputStyle, tile } from '@/lib/theme';

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
    <article style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14, opacity: isOpen(m) ? 1 : 0.8 }}>
      {/* Header: icon, name, delivery date, status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{
          width: 50, height: 50, borderRadius: 16, flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: C.accentSub, color: C.accent,
        }}>
          <Icon name="heart" size={24} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 19, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.3 }}>{m.full_name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: C.sub, marginTop: 4 }}>
            <Icon name="calendar" size={15} />
            {m.delivery_date
              ? <span>משלוח {relativeDay(m.delivery_date)} · {hebrewDate(m.delivery_date)} · {gregorianDate(m.delivery_date)}</span>
              : <span style={{ color: C.danger, fontWeight: 600 }}>עוד לא נקבע תאריך משלוח</span>}
          </div>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 800, padding: '6px 12px', borderRadius: 999, flexShrink: 0,
          backgroundColor: status.bg, color: status.text, whiteSpace: 'nowrap',
        }}>
          {STATUS_LABELS[m.delivery_status]}
        </span>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <Tile label="תאריך לידה" value={m.birth_date ? hebrewDate(m.birth_date) : '—'} sub={m.birth_date ? gregorianDate(m.birth_date) : undefined} />
        <Tile label="משלוח" value={m.delivery_date ? relativeDay(m.delivery_date) : '—'} sub={m.delivery_date ? hebrewDate(m.delivery_date) : 'לא נקבע'} />
        {isAdmin
          ? <Tile label="מוסרת" value={volunteerName ?? 'לא שובצה'} warn={!volunteerName} />
          : <Tile label="עיר" value={m.city || '—'} />}
      </div>

      {/* Address, phone, notes */}
      {(address || m.phone || m.notes) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, color: C.text }}>
          {address && (
            <Line icon="pin">
              {address}{m.address_notes && <span style={{ color: C.sub }}> · {m.address_notes}</span>}
            </Line>
          )}
          {m.phone && <Line icon="phone"><span dir="ltr">{m.phone}</span></Line>}
          {m.notes && <Line icon="edit"><span style={{ color: C.sub, whiteSpace: 'pre-wrap' }}>{m.notes}</span></Line>}
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        paddingTop: 12, borderTop: `1px solid ${C.border}`,
      }}>
        {m.phone && <a href={telLink(m.phone)} style={buttonStyle('secondary')}><Icon name="phone" size={17} />חיוג</a>}
        {waze && (
          <a href={waze} target="_blank" rel="noopener noreferrer" style={buttonStyle('secondary')}>
            <Icon name="navigate" size={17} />ניווט
          </a>
        )}

        {isAdmin ? (
          <>
            <select
              aria-label="מצב המשלוח"
              value={m.delivery_status}
              disabled={busy}
              onChange={e => onStatus(e.target.value as DeliveryStatus)}
              style={{ ...inputStyle, width: 'auto', minWidth: 130, borderRadius: 999, fontWeight: 600 }}
            >
              {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
              <IconButton label="עריכה" icon="edit" onClick={onEdit} />
              <IconButton label="מחיקה" icon="trash" onClick={onDelete} danger />
            </span>
          </>
        ) : isOpen(m) && (
          <>
            {m.delivery_status !== 'out' && (
              <button disabled={busy} onClick={() => onStatus('out')} style={buttonStyle('secondary')}>
                <Icon name="truck" size={17} />יצאתי
              </button>
            )}
            <button disabled={busy} onClick={() => onStatus('delivered')} style={buttonStyle('primary')}>
              <Icon name="check" size={17} />נמסר
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function Tile({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div style={tile}>
      <span style={{
        fontSize: 16, fontWeight: 800, color: warn ? C.danger : C.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: C.sub }}>{sub}</span>}
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
    </div>
  );
}

function Line({ icon, children }: { icon: 'pin' | 'phone' | 'edit'; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: C.accent, marginTop: 2 }}><Icon name={icon} size={17} /></span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}

function IconButton({ label, icon, onClick, danger }: {
  label: string; icon: 'edit' | 'trash'; onClick?: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick} title={label} aria-label={label} style={{
      width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: danger ? C.dangerSub : C.tile, color: danger ? C.danger : C.sub,
    }}>
      <Icon name={icon} size={18} />
    </button>
  );
}
