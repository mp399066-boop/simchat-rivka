'use client';

import type { ReactNode } from 'react';
import Icon from '@/components/ui/Icon';
import IconButton from '@/components/ui/IconButton';
import { infoOf, verb } from '@/lib/categories';
import { gregorianDate, hebrewDate, relativeDay } from '@/lib/dates';
import {
  confirmationLabel, DELIVERY_STATUSES, fullAddress, isOpen, nextStatus, STATUS_COLORS, STATUS_LABELS,
  type DeliveryStatus, type Mother,
} from '@/lib/mothers';
import { buttonStyle, card, colors as C, inputStyle, tile } from '@/lib/theme';

/**
 * One mother / young couple / simcha + the delivery. The manager gets a status picker, edit and
 * delete; a volunteer gets "יצאתי" / "נמסר" buttons only.
 */
export default function MotherCard({ mother: m, volunteerName, isAdmin, busy, prep, onStatus, onEdit, onDelete, onPrep, onRemind, onTzintuk, onConfirm }: {
  mother: Mother;
  volunteerName?: string | null;
  isAdmin: boolean;
  busy?: boolean;
  /** Prep tasks done / total (manager). */
  prep?: { done: number; total: number };
  onStatus: (status: DeliveryStatus) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrep?: () => void;
  onRemind?: () => void;
  /** Ring her phone now (passed only when a phone line is connected). */
  onTzintuk?: () => void;
  /** Mark as confirmed (phone call / change handled). */
  onConfirm?: () => void;
}) {
  const address = fullAddress(m);
  const status = STATUS_COLORS[m.delivery_status];
  const confirmation = confirmationLabel(m);
  const info = infoOf(m);
  const CONFIRM_LOOK = { ok: { bg: '#DCFCE7', fg: '#166534' }, warn: { bg: '#FEF3C7', fg: '#92400E' }, wait: { bg: C.tile, fg: C.sub } };

  return (
    <article style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14, opacity: isOpen(m) ? 1 : 0.8 }}>
      {/* Header: icon, name, delivery date, status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{
          width: 50, height: 50, borderRadius: 16, flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: C.accentSub, color: C.accent,
        }}>
          <Icon name={info.icon} size={24} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 19, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.3 }}>{m.full_name}</h3>
          {(m.occasion || (!isAdmin && info.id !== 'birth')) && (
            <div style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>{m.occasion || info.one}</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: C.sub, marginTop: 4 }}>
            <Icon name="calendar" size={15} />
            {m.delivery_date
              ? <span>משלוח {relativeDay(m.delivery_date)} · {hebrewDate(m.delivery_date)} · {gregorianDate(m.delivery_date)}</span>
              : <span style={{ color: C.danger, fontWeight: 600 }}>עוד לא נקבע תאריך משלוח</span>}
          </div>
          {isAdmin && confirmation && (
            <span style={{
              display: 'inline-block', marginTop: 6, fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
              backgroundColor: CONFIRM_LOOK[confirmation.tone].bg, color: CONFIRM_LOOK[confirmation.tone].fg,
            }}>
              {confirmation.text}
            </span>
          )}
          {isAdmin && onConfirm && isOpen(m) && m.delivery_date && m.confirm_response !== 'ok' && (
            <button onClick={onConfirm} disabled={busy} style={{
              marginTop: 6, marginInlineStart: confirmation ? 6 : 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 999, backgroundColor: C.tile, color: C.accent,
            }}>
              {m.confirm_response === 'change' ? 'טופל ✓' : `${verb(m, 'אישרה', 'אישרו')} (בטלפון) ✓`}
            </button>
          )}
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
        <Tile label={info.eventLabel} value={m.birth_date ? hebrewDate(m.birth_date) : '—'} sub={m.birth_date ? gregorianDate(m.birth_date) : undefined} />
        <Tile label="משלוח" value={m.delivery_date ? relativeDay(m.delivery_date) : '—'} sub={m.delivery_date ? hebrewDate(m.delivery_date) : 'לא נקבע'} />
        {isAdmin
          ? <Tile label="מוסרת" value={volunteerName ?? '—'} />
          : <Tile label="עיר" value={m.city || '—'} />}
      </div>

      {/* Address, phone, notes */}
      {(address || m.phone || m.notes || (isAdmin && (m.email || m.confirm_note))) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, color: C.text }}>
          {address && (
            <Line icon="pin">
              {address}{m.address_notes && <span style={{ color: C.sub }}> · {m.address_notes}</span>}
            </Line>
          )}
          {m.phone && <Line icon="phone"><span dir="ltr">{m.phone}</span></Line>}
          {isAdmin && m.email && <Line icon="mail"><span dir="ltr">{m.email}</span></Line>}
          {isAdmin && m.confirm_note && (
            <Line icon="alert"><span style={{ color: '#92400E', fontWeight: 600 }}>{info.plural ? 'הם כתבו' : 'היולדת כתבה'}: {m.confirm_note}</span></Line>
          )}
          {m.notes && <Line icon="edit"><span style={{ color: C.sub, whiteSpace: 'pre-wrap' }}>{m.notes}</span></Line>}
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        paddingTop: 12, borderTop: `1px solid ${C.border}`,
      }}>
        {isAdmin ? (
          <>
            {(() => {
              const next = m.delivery_date ? nextStatus(m.delivery_status) : null;
              return next && (
                <button disabled={busy} onClick={() => onStatus(next.status)} style={buttonStyle('primary')}>
                  {next.label}
                </button>
              );
            })()}
            <select
              aria-label="מצב המשלוח"
              value={m.delivery_status}
              disabled={busy}
              onChange={e => onStatus(e.target.value as DeliveryStatus)}
              style={{ ...inputStyle, width: 'auto', minWidth: 130, borderRadius: 999, fontWeight: 600 }}
            >
              {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            {onPrep && isOpen(m) && (
              <button onClick={onPrep} style={{
                ...buttonStyle('secondary'),
                ...(prep && prep.total && prep.done === prep.total ? { backgroundColor: C.successSub, color: C.success } : {}),
              }}>
                <Icon name="check" size={17} />מה מוכן{prep?.total ? ` ${prep.done}/${prep.total}` : ''}
              </button>
            )}
            <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
              {onRemind && m.email && m.delivery_date && isOpen(m) && (
                <IconButton label="שליחת תזכורת במייל" icon="mail" onClick={onRemind} />
              )}
              {onTzintuk && m.phone && m.delivery_date && isOpen(m) && (
                <IconButton label="שליחת צינתוק" icon="phone" onClick={onTzintuk} />
              )}
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

function Line({ icon, children }: { icon: 'pin' | 'phone' | 'edit' | 'mail' | 'alert'; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: C.accent, marginTop: 2 }}><Icon name={icon} size={17} /></span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}
