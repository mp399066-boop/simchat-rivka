import type { IconName } from '@/components/ui/Icon';

/**
 * The three kinds of meals (column `category` on mothers and menu_items,
 * supabase/categories.sql). Each has its own list, menu, stock and kitchen
 * sheet, under its own address: /mothers, /weddings, /simchas.
 * Everything that names the recipient goes through here — a mother is "she",
 * a couple or a family is "they".
 */
export type Category = 'birth' | 'wedding' | 'simcha';

export interface CategoryInfo {
  id: Category;
  label: string;          // tab / page name: "יולדות"
  listLabel: string;      // the list's sub-tab: "יולדות" / "זוגות"
  base: string;           // the list's address; prep and menu are under it
  icon: IconName;
  one: string;            // "יולדת" / "זוג" / "שמחה" — a badge on mixed lists
  newLabel: string;       // the add button
  added: string;          // toast after adding
  editLabel: string;
  details: string;        // form section
  nameLabel: string;      // the name field
  nameHint?: string;
  eventLabel: string;     // the date of the event (column birth_date)
  eventDone: string;      // "ילדה" + date
  /** Delivery date presets: days after the event (the form also has "another date"). */
  plans: { days: number; label: string }[];
  meal: string;           // "ארוחת בוקר" — in e-mails and the confirmation page
  plural: boolean;        // the recipient is "they" (a couple / a family)
  empty: string;          // empty list hint
}

export const CATEGORY_INFO: Record<Category, CategoryInfo> = {
  birth: {
    id: 'birth', label: 'יולדות', listLabel: 'יולדות', base: '/mothers', icon: 'heart', one: 'יולדת',
    newLabel: 'יולדת חדשה', added: 'היולדת נוספה', editLabel: 'עריכת יולדת', details: 'פרטי היולדת',
    nameLabel: 'שם מלא', eventLabel: 'תאריך לידה', eventDone: 'ילדה',
    plans: [{ days: 7, label: 'שבוע אחרי הלידה' }, { days: 14, label: 'שבועיים אחרי הלידה' }],
    meal: 'ארוחת בוקר', plural: false,
    empty: "לחצי על '+ יולדת חדשה' כדי להוסיף את הראשונה.",
  },
  wedding: {
    id: 'wedding', label: 'חתונות', listLabel: 'זוגות', base: '/weddings', icon: 'ring', one: 'זוג צעיר',
    newLabel: 'זוג חדש', added: 'הזוג נוסף', editLabel: 'עריכת זוג', details: 'פרטי הזוג הצעיר',
    nameLabel: 'שמות החתן והכלה', nameHint: 'למשל: משה ורחל כהן',
    eventLabel: 'תאריך החתונה', eventDone: 'התחתנו',
    plans: [{ days: 7, label: 'אחרי שבע ברכות' }, { days: 1, label: 'יום אחרי החתונה' }],
    meal: 'ארוחה לזוג הצעיר', plural: true,
    empty: "לחצי על '+ זוג חדש' כדי להוסיף את הראשון.",
  },
  simcha: {
    id: 'simcha', label: 'שמחות', listLabel: 'שמחות', base: '/simchas', icon: 'gift', one: 'שמחה',
    newLabel: 'שמחה חדשה', added: 'השמחה נוספה', editLabel: 'עריכת שמחה', details: 'פרטי המשפחה',
    nameLabel: 'שם המשפחה', nameHint: 'למשל: משפחת לוי',
    eventLabel: 'תאריך השמחה', eventDone: 'השמחה',
    plans: [{ days: 0, label: 'ביום השמחה' }, { days: 1, label: 'יום אחרי השמחה' }],
    meal: 'ארוחה לשמחה', plural: true,
    empty: "לחצי על '+ שמחה חדשה' כדי להוסיף את הראשונה.",
  },
};

export const CATEGORIES: CategoryInfo[] = [CATEGORY_INFO.birth, CATEGORY_INFO.wedding, CATEGORY_INFO.simcha];

/** A row's category (rows saved before categories.sql ran count as births). */
export const categoryOf = (row: { category?: Category | null }): Category => row.category ?? 'birth';

export const infoOf = (row: { category?: Category | null }) => CATEGORY_INFO[categoryOf(row)];

/** Only the rows of one category. */
export const inCategory = <T extends { category?: Category | null }>(rows: T[], category: Category) =>
  rows.filter(r => categoryOf(r) === category);

/** The verb for the recipient: she (`fem`) or they (`plural`). */
export const verb = (row: { category?: Category | null }, fem: string, plural: string) =>
  infoOf(row).plural ? plural : fem;
