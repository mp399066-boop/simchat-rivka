'use client';

import { useState } from 'react';
import { fullDate, gematria, israelDate } from '@/lib/dates';
import { daysInMonth, fromHebrew, hebrewDayMonth, hebrewYearOf, monthsOf } from '@/lib/hebrewCalendar';
import { colors as C, inputStyle } from '@/lib/theme';

/**
 * Date picker that works in the Hebrew calendar: day / month / year selects
 * (ט״ו · חשוון · תשפ״ז), with the matching Gregorian date shown below.
 * "לוח לועזי" switches to the browser's Gregorian date input.
 * value / onChange use yyyy-mm-dd ('' = empty).
 */
export default function DateInput({ value, onChange, label }: {
  value: string;
  onChange: (iso: string) => void;
  label: string;
}) {
  const [gregorian, setGregorian] = useState(false);
  const thisYear = hebrewYearOf(israelDate());

  // The selects' own state, so a half-picked date (day + month, no year yet) is kept.
  const [parts, setParts] = useState(() => {
    if (!value) return { day: 0, month: '', year: thisYear };
    return { ...hebrewDayMonth(value), year: hebrewYearOf(value) };
  });

  const months = monthsOf(parts.year);
  const maxDay = parts.month ? daysInMonth(parts.year, parts.month) : 30;

  function pick(next: { day: number; month: string; year: number }) {
    // A month that doesn't exist in the newly picked year (אדר א׳/ב׳ ↔ אדר).
    if (next.month && !monthsOf(next.year).includes(next.month)) {
      next = { ...next, month: next.month.startsWith('אדר') ? (monthsOf(next.year).find(m => m.startsWith('אדר')) ?? '') : '' };
    }
    if (next.month && next.day > daysInMonth(next.year, next.month)) next = { ...next, day: daysInMonth(next.year, next.month) };
    setParts(next);
    const iso = next.day && next.month ? fromHebrew(next.year, next.month, next.day) : null;
    onChange(iso ?? '');
  }

  const select = { ...inputStyle, padding: '10px 8px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {gregorian ? (
        <input type="date" aria-label={label} value={value} onChange={e => {
          const iso = e.target.value;
          onChange(iso);
          if (iso) setParts({ ...hebrewDayMonth(iso), year: hebrewYearOf(iso) });
        }} style={inputStyle} />
      ) : (
        <div role="group" aria-label={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.2fr', gap: 6 }}>
          <select aria-label="יום" value={parts.day || ''} onChange={e => pick({ ...parts, day: Number(e.target.value) })} style={select}>
            <option value="">יום</option>
            {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => <option key={d} value={d}>{gematria(d)}</option>)}
          </select>
          <select aria-label="חודש" value={parts.month} onChange={e => pick({ ...parts, month: e.target.value })} style={select}>
            <option value="">חודש</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select aria-label="שנה" value={parts.year} onChange={e => pick({ ...parts, year: Number(e.target.value) })} style={select}>
            {[thisYear - 1, thisYear, thisYear + 1].map(y => <option key={y} value={y}>{gematria(y % 1000)}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
        <span style={{ color: value ? C.deep : C.muted, fontWeight: value ? 600 : 400 }}>
          {value ? fullDate(value) : 'לא נבחר תאריך'}
        </span>
        <span style={{ display: 'flex', gap: 10 }}>
          {value && (
            <button type="button" onClick={() => { setParts({ day: 0, month: '', year: thisYear }); onChange(''); }}
              style={linkButton}>ניקוי</button>
          )}
          <button type="button" onClick={() => setGregorian(g => !g)} style={linkButton}>
            {gregorian ? 'לוח עברי' : 'לוח לועזי'}
          </button>
        </span>
      </div>
    </div>
  );
}

const linkButton = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
  fontSize: 13, fontWeight: 700, color: C.accent, textDecoration: 'underline',
} as const;
