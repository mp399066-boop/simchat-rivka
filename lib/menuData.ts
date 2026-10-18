/**
 * Reading and writing the menu from the browser. RLS (supabase/menu.sql):
 * every authorized user reads, only the manager writes. Every function
 * returns a Hebrew error message ready for a toast, never throws.
 */

import type { Category } from '@/lib/categories';
import { supabase } from '@/lib/supabase';
import type { MenuItem, MenuItemInput } from '@/lib/menu';

type Result<T> = { data: T; error: null } | { data: null; error: string };

const COLUMNS = 'id, category, name, details, unit, per_meal, stock, source, sort_order, is_active';

/** The menu of one category, or of all of them (each item carries its category). */
export async function loadMenu(category?: Category): Promise<Result<MenuItem[]>> {
  try {
    // A small table (tens of rows) — far below the 1000-row page limit.
    let query = supabase.from('menu_items').select(COLUMNS);
    if (category) query = query.eq('category', category);
    const { data, error } = await query.order('sort_order').order('name').order('id');
    if (error) {
      console.error('[loadMenu]', error.code, error.message);
      return { data: null, error: 'טעינת התפריט נכשלה' };
    }
    return { data: data as MenuItem[], error: null };
  } catch {
    return { data: null, error: 'אין חיבור לאינטרנט' };
  }
}

/** Insert into `category` (id = null, added at the end) or update. */
export async function saveMenuItem(id: string | null, input: MenuItemInput, category: Category, nextOrder = 0): Promise<{ error: string | null }> {
  try {
    const { error } = id
      ? await supabase.from('menu_items').update(input).eq('id', id).select('id').single()
      : await supabase.from('menu_items').insert({ ...input, category, sort_order: nextOrder }).select('id').single();
    if (error) {
      console.error('[saveMenuItem]', error.code, error.message);
      return { error: 'השמירה נכשלה' };
    }
    return { error: null };
  } catch {
    return { error: 'אין חיבור לאינטרנט' };
  }
}

/** A new category's menu as a copy of another one's items (stock starts at 0). */
export async function copyMenu(items: MenuItem[], category: Category): Promise<{ error: string | null }> {
  const rows = items.map(i => ({
    category, name: i.name, details: i.details, unit: i.unit, per_meal: i.per_meal,
    stock: 0, source: i.source, sort_order: i.sort_order, is_active: i.is_active,
  }));
  if (!rows.length) return { error: null };
  try {
    const { data, error } = await supabase.from('menu_items').insert(rows).select('id');
    if (error || data?.length !== rows.length) {
      if (error) console.error('[copyMenu]', error.code, error.message);
      return { error: 'העתקת התפריט נכשלה' };
    }
    return { error: null };
  } catch {
    return { error: 'אין חיבור לאינטרנט' };
  }
}

export async function setStock(id: string, stock: number): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.from('menu_items').update({ stock }).eq('id', id).select('id');
    if (error || !data?.length) {
      if (error) console.error('[setStock]', error.code, error.message);
      return { error: 'עדכון המלאי נכשל' };
    }
    return { error: null };
  } catch {
    return { error: 'אין חיבור לאינטרנט' };
  }
}

export async function deleteMenuItem(id: string): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.from('menu_items').delete().eq('id', id).select('id');
    if (error || !data?.length) {
      if (error) console.error('[deleteMenuItem]', error.code, error.message);
      return { error: 'המחיקה נכשלה' };
    }
    return { error: null };
  } catch {
    return { error: 'אין חיבור לאינטרנט' };
  }
}
