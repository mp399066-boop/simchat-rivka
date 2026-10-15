/**
 * Reading and writing mothers from the browser. Access is enforced by RLS
 * (supabase/mothers.sql): the manager gets everything, a volunteer only the
 * mothers assigned to her, and status changes go through set_delivery_status().
 *
 * Every function returns { error } as a Hebrew message ready for a toast,
 * never throws.
 */

import { fetchAll } from '@/lib/fetchAll';
import { authFetch, supabase } from '@/lib/supabase';
import type { DeliveryStatus, Mother, MotherInput } from '@/lib/mothers';
import type { AuthorizedUser } from '@/lib/users';

type Result<T> = { data: T; error: null } | { data: null; error: string };

export async function loadMothers(): Promise<Result<Mother[]>> {
  try {
    const { data, error } = await fetchAll<Mother>((from, to) =>
      supabase.from('mothers').select('*')
        .order('delivery_date', { ascending: true, nullsFirst: true })
        .order('id').range(from, to));
    if (error) {
      console.error('[loadMothers]', error.message);
      return { data: null, error: 'טעינת היולדות נכשלה' };
    }
    return { data, error: null };
  } catch {
    return { data: null, error: 'אין חיבור לאינטרנט' };
  }
}

/** Authorized users (for assigning a volunteer). Manager only. */
export async function loadTeam(): Promise<Result<AuthorizedUser[]>> {
  try {
    const res = await authFetch('/api/admin/users');
    if (!res.ok) return { data: null, error: 'טעינת רשימת המתנדבות נכשלה' };
    return { data: await res.json(), error: null };
  } catch {
    return { data: null, error: 'אין חיבור לאינטרנט' };
  }
}

/** Insert (id = null) or update. Returns the saved row. */
export async function saveMother(id: string | null, input: MotherInput): Promise<Result<Mother>> {
  try {
    const query = id
      ? supabase.from('mothers').update(input).eq('id', id).select('*').single()
      : supabase.from('mothers').insert(input).select('*').single();
    const { data, error } = await query;
    if (error) {
      console.error('[saveMother]', error.code, error.message);
      return { data: null, error: 'השמירה נכשלה' };
    }
    return { data: data as Mother, error: null };
  } catch {
    return { data: null, error: 'אין חיבור לאינטרנט' };
  }
}

export async function deleteMother(id: string): Promise<{ error: string | null }> {
  try {
    // .select() so a delete that RLS silently skipped (0 rows) is reported too.
    const { data, error } = await supabase.from('mothers').delete().eq('id', id).select('id');
    if (error || !data?.length) {
      if (error) console.error('[deleteMother]', error.code, error.message);
      return { error: 'המחיקה נכשלה' };
    }
    return { error: null };
  } catch {
    return { error: 'אין חיבור לאינטרנט' };
  }
}

export async function setDeliveryStatus(id: string, status: DeliveryStatus): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.rpc('set_delivery_status', { p_mother_id: id, p_status: status });
    if (error) {
      console.error('[setDeliveryStatus]', error.code, error.message);
      return { error: 'עדכון המצב נכשל' };
    }
    return { error: null };
  } catch {
    return { error: 'אין חיבור לאינטרנט' };
  }
}

/**
 * The manager marks the delivery as confirmed — after a phone call, or after
 * handling a change she asked for. Her note (if any) is kept.
 */
export async function markConfirmed(id: string): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.from('mothers')
      .update({ confirm_response: 'ok', confirmed_at: new Date().toISOString() }).eq('id', id).select('id');
    if (error || !data?.length) {
      if (error) console.error('[markConfirmed]', error.code, error.message);
      return { error: 'העדכון נכשל' };
    }
    return { error: null };
  } catch {
    return { error: 'אין חיבור לאינטרנט' };
  }
}
