import { hebrewDate, relativeDay, shiftDate } from '@/lib/dates';
import { isOpen, type Mother } from '@/lib/mothers';
import type { IconName } from '@/components/ui/Icon';

/**
 * "What needs doing" — the manager's action list, worked out from the data:
 * every open problem becomes one line with a link to where it is fixed.
 */

export type Urgency = 'now' | 'week' | 'later';

export interface Action {
  key: string;
  urgency: Urgency;
  icon: IconName;
  text: string;
  detail?: string;
  href: string;
  cta: string;
}

export const URGENCY_LABELS: Record<Urgency, string> = {
  now:   'דחוף – היום ומחר',
  week:  'השבוע',
  later: 'בהמשך',
};

/** Link to the mothers page, filtered to one mother. */
const motherLink = (m: Mother) => `/mothers?q=${encodeURIComponent(m.full_name)}`;

/** Below this many units on the ימות המשיח line the manager is warned (a צינתוק costs 0.1 per phone). */
export const LOW_TZINTUK_UNITS = 2;

export function computeActions({ mothers, today, tzintukUnits = null }: {
  mothers: Mother[]; today: string; tzintukUnits?: number | null;
}): Action[] {
  const tomorrow = shiftDate(today, 1);
  const actions: Action[] = [];
  const when = (date: string) => `${relativeDay(date)} · ${hebrewDate(date)}`;

  // The צינתוק line is running out of units.
  if (tzintukUnits !== null && tzintukUnits < LOW_TZINTUK_UNITS) {
    actions.push({
      key: 'tzintuk-units', urgency: tzintukUnits < 0.1 ? 'now' : 'week', icon: 'phone',
      text: tzintukUnits < 0.1 ? 'נגמרו היחידות לצינתוק – היולדות לא מקבלות צינתוק' : 'נשארו מעט יחידות לצינתוק',
      detail: `נשארו ${tzintukUnits} יחידות בימות המשיח · לטעון בטאב "יחידות" באתר הניהול שלהם`,
      href: '/users', cta: 'לפרטים',
    });
  }

  for (const m of mothers.filter(isOpen)) {
    const date = m.delivery_date;

    // She asked to change something.
    if (m.confirm_response === 'change') {
      actions.push({
        key: `change-${m.id}`, urgency: 'now', icon: 'alert',
        text: `${m.full_name} ביקשה שינוי`, detail: m.confirm_note ?? undefined,
        href: motherLink(m), cta: 'לטיפול',
      });
    }

    if (!date) {
      actions.push({
        key: `date-${m.id}`, urgency: 'week', icon: 'calendar',
        text: `לקבוע תאריך משלוח ל${m.full_name}`,
        detail: m.birth_date ? `ילדה ${hebrewDate(m.birth_date)}` : undefined,
        href: motherLink(m), cta: 'לקביעה',
      });
      continue;
    }

    if (date < today) {
      actions.push({
        key: `late-${m.id}`, urgency: 'now', icon: 'alert',
        text: `המשלוח ל${m.full_name} היה ב${hebrewDate(date)} ועוד לא סומן "נמסר"`,
        href: motherLink(m), cta: 'לעדכון',
      });
      continue;
    }

    // Delivering today / tomorrow and she hasn't confirmed: make sure she's home.
    if (date <= tomorrow && !m.confirm_response) {
      actions.push({
        key: `confirm-${m.id}`, urgency: 'now', icon: 'phone',
        text: `לוודא עם ${m.full_name} שתהיה בבית`,
        detail: `${when(date)}${m.phone ? ` · ${m.phone}` : ''}${m.reminder_sent_at ? ' · נשלחה תזכורת במייל' : ''}`,
        href: motherLink(m), cta: 'לסימון',
      });
    }
  }

  const order: Record<Urgency, number> = { now: 0, week: 1, later: 2 };
  return actions.sort((a, b) => order[a.urgency] - order[b.urgency]);
}
