/**
 * Dates are stored as yyyy-mm-dd (Postgres `date`) and always meant in
 * Israel time, whatever the device's time zone.
 */

const TZ = 'Asia/Jerusalem';

/** yyyy-mm-dd of today in Israel, shifted by `addDays`. */
export function israelDate(addDays = 0): string {
  // en-CA formats as yyyy-mm-dd.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  if (!addDays) return today;
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + addDays);
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/** "יום שלישי 14.10" for a yyyy-mm-dd date. */
export function formatDate(iso: string | null, withWeekday = true): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const short = `${d}.${m}${y !== new Date().getFullYear() ? `.${String(y).slice(2)}` : ''}`;
  return withWeekday ? `יום ${WEEKDAYS[date.getUTCDay()]} ${short}` : short;
}

/** "היום" / "מחר" / "אתמול" or the formatted date. */
export function relativeDate(iso: string | null): string {
  if (!iso) return '';
  if (iso === israelDate(0))  return 'היום';
  if (iso === israelDate(1))  return 'מחר';
  if (iso === israelDate(-1)) return 'אתמול';
  return formatDate(iso);
}
