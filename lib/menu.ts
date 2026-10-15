import { israelDate, shiftDate } from '@/lib/dates';
import { isOpen, type Mother } from '@/lib/mothers';

/** A row of `menu_items` — one thing that goes into every meal. */
export interface MenuItem {
  id: string;
  name: string;
  details: string | null;
  unit: string;
  per_meal: number;
  stock: number;
  sort_order: number;
  is_active: boolean;
}

export type MenuItemInput = Pick<MenuItem, 'name' | 'details' | 'unit' | 'per_meal' | 'stock' | 'is_active'>;

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
