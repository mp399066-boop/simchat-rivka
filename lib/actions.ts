import { hebrewDate, relativeDay, shiftDate } from '@/lib/dates';
import type { MenuItem } from '@/lib/menu';
import { isOpen, type Mother } from '@/lib/mothers';
import type { PrepTask } from '@/lib/prepData';
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

export function computeActions({ mothers, prep, items, today }: {
  mothers: Mother[];
  prep: PrepTask[];
  items: MenuItem[] | null;   // null = menu not loaded (prep lines are skipped)
  today: string;
}): Action[] {
  const tomorrow = shiftDate(today, 1);
  const weekEnd = shiftDate(today, 6);
  const activeItems = items?.filter(i => i.is_active) ?? [];
  const actions: Action[] = [];
  const urgencyOf = (date: string): Urgency => (date <= tomorrow ? 'now' : date <= weekEnd ? 'week' : 'later');
  const when = (date: string) => `${relativeDay(date)} · ${hebrewDate(date)}`;

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

    const urgency = urgencyOf(date);
    if (!m.delivery_volunteer_id) {
      actions.push({
        key: `deliver-${m.id}`, urgency, icon: 'truck',
        text: `לשבץ מתנדבת שתמסור ל${m.full_name}`, detail: when(date),
        href: motherLink(m), cta: 'לשיבוץ',
      });
    }

    if (items) {
      const tasks = prep.filter(t => t.mother_id === m.id);
      const unassigned = activeItems.filter(i => !tasks.some(t => t.menu_item_id === i.id && t.assignee_id)).length;
      const notDone = tasks.filter(t => !t.done).length;
      if (unassigned > 0 && urgency !== 'later') {
        actions.push({
          key: `prep-${m.id}`, urgency, icon: 'chef',
          text: `לשבץ מי מכינה לארוחה של ${m.full_name}`,
          detail: `${when(date)} · ${unassigned} פריטים בלי מבשלת`,
          href: '/prep', cta: 'לשיבוץ',
        });
      } else if (notDone > 0 && date <= tomorrow) {
        actions.push({
          key: `prepdone-${m.id}`, urgency: 'now', icon: 'chef',
          text: `${notDone} הכנות עוד לא מוכנות לארוחה של ${m.full_name}`, detail: when(date),
          href: '/prep', cta: 'לבדיקה',
        });
      }
    }
  }

  const order: Record<Urgency, number> = { now: 0, week: 1, later: 2 };
  return actions.sort((a, b) => order[a.urgency] - order[b.urgency]);
}
