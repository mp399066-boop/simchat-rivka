/**
 * Reading and writing the menu from the browser. RLS (supabase/menu.sql):
 * every authorized user reads, only the manager writes. Every function
 * returns a Hebrew error message ready for a toast, never throws.
 */

import { supabase } from '@/lib/supabase';
import type { MenuItem, MenuItemInput } from '@/lib/menu';

type Result<T> = { data: T; error: null } | { data: null; error: string };

const COLUMNS = 'id, name, details, unit, per_meal, stock, source, sort_order, is_active';

export async function loadMenu(): Promise<Result<MenuItem[]>> {
  try {
    // A small table (tens of rows) — far below the 1000-row page limit.
    const { data, error } = await supabase.from('menu_items').select(COLUMNS)
      .order('sort_order').order('name').order('id');
    if (error) {
      console.error('[loadMenu]', error.code, error.message);
      return { data: null, error: 'טעינת התפריט נכשלה' };
    }
    return { data: data as MenuItem[], error: null };
  } catch {
    return { data: null, error: 'אין חיבור לאינטרנט' };
  }
}

/** Insert (id = null, added at the end) or update. */
export async function saveMenuItem(id: string | null, input: MenuItemInput, nextOrder = 0): Promise<{ error: string | null }> {
  try {
    const { error } = id
      ? await supabase.from('menu_items').update(input).eq('id', id).select('id').single()
      : await supabase.from('menu_items').insert({ ...input, sort_order: nextOrder }).select('id').single();
    if (error) {
      console.error('[saveMenuItem]', error.code, error.message);
      return { error: 'השמירה נכשלה' };
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
