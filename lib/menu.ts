import { israelDate, shiftDate } from '@/lib/dates';
import { isOpen, type Mother } from '@/lib/mothers';

/**
 * Where an item comes from: made ahead and kept in the freezer (stock = what
 * is in the freezer), made fresh, or bought ready.
 */
export type ItemSource = 'freezer' | 'prepare' | 'buy';

export const SOURCES: { id: ItemSource; label: string; bg: string; text: string }[] = [
  { id: 'freezer', label: 'מהפריזר', bg: '#E0F2FE', text: '#075985' },
  { id: 'prepare', label: 'להכין',   bg: '#FEF3C7', text: '#92400E' },
  { id: 'buy',     label: 'לקנות',   bg: '#EDE9FE', text: '#5B21B6' },
];
export const sourceOf = (id: ItemSource) => SOURCES.find(s => s.id === id) ?? SOURCES[2];

/** A row of `menu_items` — one thing that goes into every meal. */
export interface MenuItem {
  id: string;
  name: string;
  details: string | null;
  unit: string;
  per_meal: number;
  stock: number;
  source: ItemSource;
  sort_order: number;
  is_active: boolean;
}

export type MenuItemInput = Pick<MenuItem, 'name' | 'details' | 'unit' | 'per_meal' | 'stock' | 'source' | 'is_active'>;

/** How far ahead to plan. */
export type Horizon = 'tomorrow' | 'week' | 'twoWeeks';
export const HORIZONS: { id: Horizon; label: string; days: number }[] = [
  { id: 'tomorrow', label: 'עד מחר',          days: 2 },
  { id: 'week',     label: 'שבוע קרוב',       days: 7 },
  { id: 'twoWeeks', label: 'שבועיים קרובים',  days: 14 },
];

/**
 * Meals still to be packed up to the horizon (incl. overdue ones): open,
 * dated, and not yet taken off the stock.
 */
export function mealsToPack(mothers: Mother[], horizon: Horizon): Mother[] {
  const days = HORIZONS.find(h => h.id === horizon)?.days ?? 7;
  const last = shiftDate(israelDate(), days - 1);
  return mothers.filter(m => isOpen(m) && !m.stock_used && m.delivery_date && m.delivery_date <= last);
}

export interface ItemPlan {
  item: MenuItem;
  needed: number;    // for the meals in the horizon
  missing: number;   // needed − stock, never below 0
  ready: number;     // 0..1 — how much of the need the stock covers
}

export function planItems(items: MenuItem[], meals: number): ItemPlan[] {
  return items.map(item => {
    const needed = item.is_active ? item.per_meal * meals : 0;
    const missing = Math.max(0, needed - Math.max(0, item.stock));
    return { item, needed, missing, ready: needed ? Math.min(1, Math.max(0, item.stock) / needed) : 1 };
  });
}

/** One line of the to-do list: an item and how many. */
export interface TodoLine { item: MenuItem; amount: number }

export interface TodoLists {
  thaw: TodoLine[];      // take out of the freezer for today's and tomorrow's meals
  prepare: TodoLine[];   // missing items that are made (fresh, or made and frozen)
  buy: TodoLine[];       // missing items that are bought
}

/**
 * What still has to be done for the meals up to the horizon: what to take out
 * of the freezer now (for today and tomorrow, as far as the freezer has it),
 * what to make, and what to buy.
 */
export function todoLists(items: MenuItem[], mothers: Mother[], horizon: Horizon): TodoLists {
  const soon = mealsToPack(mothers, 'tomorrow').length;
  const plans = planItems(items, mealsToPack(mothers, horizon).length);
  const missing = (p: ItemPlan) => p.missing > 0;
  return {
    thaw: items
      .filter(i => i.is_active && i.source === 'freezer')
      .map(item => ({ item, amount: Math.min(item.per_meal * soon, Math.max(0, item.stock)) }))
      .filter(l => l.amount > 0),
    prepare: plans.filter(p => missing(p) && p.item.source !== 'buy').map(p => ({ item: p.item, amount: p.missing })),
    buy: plans.filter(p => missing(p) && p.item.source === 'buy').map(p => ({ item: p.item, amount: p.missing })),
  };
}
