/** A new mother (יולדת) and her one-time delivery — a row of `mothers`. */
export interface Mother {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;            // for the reminder the day before
  address: string | null;
  city: string | null;
  address_notes: string | null;
  birth_date: string | null;       // yyyy-mm-dd
  notes: string | null;
  delivery_date: string | null;    // yyyy-mm-dd; null = not scheduled yet
  delivery_status: DeliveryStatus;
  delivery_volunteer_id: string | null;
  delivered_at: string | null;
  stock_used: boolean;             // the meal's items were taken off the stock
  reminder_sent_at: string | null; // when the reminder e-mail went out
  confirmed_at: string | null;     // when she answered the reminder
  confirm_response: 'ok' | 'change' | null;
  confirm_note: string | null;
  created_at: string;
  updated_at: string;
}

export type DeliveryStatus = 'planned' | 'preparing' | 'ready' | 'out' | 'delivered' | 'cancelled';

export const DELIVERY_STATUSES: DeliveryStatus[] = ['planned', 'preparing', 'ready', 'out', 'delivered', 'cancelled'];

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  planned:   'מתוכנן',
  preparing: 'בהכנה',
  ready:     'מוכן',
  out:       'יצא למסירה',
  delivered: 'נמסר',
  cancelled: 'בוטל',
};

/** Badge colors per status (background, text). */
export const STATUS_COLORS: Record<DeliveryStatus, { bg: string; text: string }> = {
  planned:   { bg: '#EEF2FF', text: '#3730A3' },
  preparing: { bg: '#FEF3C7', text: '#92400E' },
  ready:     { bg: '#E0F2FE', text: '#075985' },
  out:       { bg: '#FDF0F5', text: '#A8114C' },
  delivered: { bg: '#DCFCE7', text: '#166534' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
};

/** Still to be handled (not delivered, not cancelled). */
export const isOpen = (m: Pick<Mother, 'delivery_status'>) =>
  m.delivery_status !== 'delivered' && m.delivery_status !== 'cancelled';

/** The editable fields, as the form sends them. */
export type MotherInput = Pick<Mother,
  'full_name' | 'phone' | 'email' | 'address' | 'city' | 'address_notes' | 'birth_date' | 'notes'
  | 'delivery_date' | 'delivery_status' | 'delivery_volunteer_id'>;

/** Full address in one line, for display and for navigation apps. */
export function fullAddress(m: Pick<Mother, 'address' | 'city'>): string {
  return [m.address, m.city].filter(Boolean).join(', ');
}

/** Waze navigation link for the address, or null if there is none. */
export function wazeLink(m: Pick<Mother, 'address' | 'city'>): string | null {
  const a = fullAddress(m);
  return a ? `https://waze.com/ul?q=${encodeURIComponent(a)}&navigate=yes` : null;
}

/** tel: link (digits and + only). */
export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** What the mother answered to the reminder, for display. */
export function confirmationLabel(m: Pick<Mother, 'reminder_sent_at' | 'confirm_response'>): { text: string; tone: 'ok' | 'warn' | 'wait' } | null {
  if (m.confirm_response === 'ok') return { text: 'אישרה ✓', tone: 'ok' };
  if (m.confirm_response === 'change') return { text: 'ביקשה שינוי', tone: 'warn' };
  if (m.reminder_sent_at) return { text: 'נשלחה תזכורת', tone: 'wait' };
  return null;
}
