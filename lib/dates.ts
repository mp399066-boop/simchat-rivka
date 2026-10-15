/**
 * Dates are stored as yyyy-mm-dd (Postgres `date`) and always meant in
 * Israel time, whatever the device's time zone. Every date shown to users
 * carries the Hebrew date too (the browser's built-in Hebrew calendar; the
 * numbers are written in Hebrew letters here).
 */

const TZ = 'Asia/Jerusalem';

/** Noon UTC of a yyyy-mm-dd day — safe from time-zone edge cases. */
const toDate = (iso: string) => new Date(`${iso}T12:00:00Z`);

/** yyyy-mm-dd of today in Israel, shifted by `addDays`. */
export function israelDate(addDays = 0): string {
  // en-CA formats as yyyy-mm-dd.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  return addDays ? shiftDate(today, addDays) : today;
}

/** yyyy-mm-dd + n days. */
export function shiftDate(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const weekday = (iso: string) => WEEKDAYS[toDate(iso).getUTCDay()];

/** "15.10" (or "15.10.27" when not this year). */
export function gregorianDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}.${m}${y !== new Date().getFullYear() ? `.${String(y).slice(2)}` : ''}`;
}

// ── Hebrew date ─────────────────────────────────────────────────────────────

const hebrewFormat = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

/** Day, month name and year in the Hebrew calendar. */
function hebrewParts(iso: string): { day: number; month: string; year: number } {
  const parts = hebrewFormat.formatToParts(toDate(iso));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return { day: Number(get('day')), month: get('month'), year: Number(get('year')) };
}

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];

/** 4 → ד׳, 15 → ט״ו, 787 → תשפ״ז (Hebrew numerals). */
export function gematria(n: number): string {
  let s = HUNDREDS[Math.floor(n / 100) % 10];
  const rest = n % 100;
  if (rest === 15) s += 'טו';
  else if (rest === 16) s += 'טז';
  else s += TENS[Math.floor(rest / 10)] + ONES[rest % 10];
  return s.length === 1 ? `${s}׳` : `${s.slice(0, -1)}״${s.slice(-1)}`;
}

/** "ד׳ בחשוון" — or "ד׳ בחשוון תשפ״ז" with the year. */
export function hebrewDate(iso: string | null, withYear = false): string {
  if (!iso) return '';
  const { day, month, year } = hebrewParts(iso);
  return `${gematria(day)} ב${month}${withYear ? ` ${gematria(year % 1000)}` : ''}`;
}

/** "יום חמישי · ד׳ בחשוון · 15.10" */
export function fullDate(iso: string | null): string {
  if (!iso) return '';
  return `יום ${weekday(iso)} · ${hebrewDate(iso)} · ${gregorianDate(iso)}`;
}

/** "היום" / "מחר" / "אתמול" / "יום חמישי". */
export function relativeDay(iso: string | null): string {
  if (!iso) return '';
  if (iso === israelDate(0))  return 'היום';
  if (iso === israelDate(1))  return 'מחר';
  if (iso === israelDate(-1)) return 'אתמול';
  return `יום ${weekday(iso)}`;
}

// ── Days without deliveries ─────────────────────────────────────────────────

/** Yom Tov days in Israel, by Hebrew month and day. */
const YOM_TOV: Record<string, number[]> = {
  'תשרי': [1, 2, 10, 15, 22],  // ראש השנה, יום כיפור, סוכות, שמיני עצרת
  'ניסן': [15, 21],            // פסח, שביעי של פסח
  'סיוון': [6],                // שבועות
};

/** The reason no delivery can go out that day (שבת / יום טוב), or null. */
export function noDeliveryReason(iso: string): string | null {
  if (toDate(iso).getUTCDay() === 6) return 'שבת';
  const { day, month } = hebrewParts(iso);
  return YOM_TOV[month]?.includes(day) ? 'יום טוב' : null;
}

/** The same day, or the first day after it that is not שבת / יום טוב. */
export function nextDeliveryDay(iso: string): string {
  let d = iso;
  while (noDeliveryReason(d)) d = shiftDate(d, 1);
  return d;
}
