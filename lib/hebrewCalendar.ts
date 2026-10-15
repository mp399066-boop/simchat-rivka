/**
 * Hebrew → Gregorian conversion with no library: the browser's built-in
 * Hebrew calendar maps every Gregorian day to its Hebrew date; scanning one
 * Hebrew year (≈ 385 days) gives the reverse map. Cached per year.
 */

import { shiftDate } from '@/lib/dates';

const format = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

interface HebrewDay { iso: string; month: string; day: number }

function partsOf(iso: string) {
  const parts = format.formatToParts(new Date(`${iso}T12:00:00Z`));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return { day: Number(get('day')), month: get('month'), year: Number(get('year')) };
}

const cache = new Map<number, HebrewDay[]>();

/** Every day of Hebrew year `year` (e.g. 5787), in order, from 1 Tishrei. */
function daysOfYear(year: number): HebrewDay[] {
  const hit = cache.get(year);
  if (hit) return hit;
  // Hebrew year Y starts in September/October of Gregorian year Y − 3761.
  const days: HebrewDay[] = [];
  let iso = `${year - 3761}-08-20`;
  for (let i = 0; i < 430; i++, iso = shiftDate(iso, 1)) {
    const p = partsOf(iso);
    if (p.year === year) days.push({ iso, month: p.month, day: p.day });
    else if (p.year > year) break;
  }
  cache.set(year, days);
  return days;
}

/** The Hebrew year of a yyyy-mm-dd date. */
export const hebrewYearOf = (iso: string) => partsOf(iso).year;

/** Day and month (name) of a yyyy-mm-dd date in the Hebrew calendar. */
export function hebrewDayMonth(iso: string): { day: number; month: string } {
  const { day, month } = partsOf(iso);
  return { day, month };
}

/** Month names of a Hebrew year, in order (Tishrei first; Adar I/II in leap years). */
export function monthsOf(year: number): string[] {
  return [...new Set(daysOfYear(year).map(d => d.month))];
}

/** Number of days in a Hebrew month (29 or 30). */
export function daysInMonth(year: number, month: string): number {
  return daysOfYear(year).filter(d => d.month === month).length;
}

/** yyyy-mm-dd of a Hebrew date, or null if there is no such day. */
export function fromHebrew(year: number, month: string, day: number): string | null {
  return daysOfYear(year).find(d => d.month === month && d.day === day)?.iso ?? null;
}
