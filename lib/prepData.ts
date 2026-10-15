/**
 * Preparation tasks — who prepares which menu item for which meal.
 * RLS (supabase/prep-and-reminders.sql): the manager reads and writes all;
 * a volunteer sees only her own tasks, through my_prep_tasks(), and ticks
 * them through set_prep_done(). Functions return Hebrew errors, never throw.
 */

import { fetchAll } from '@/lib/fetchAll';
import { supabase } from '@/lib/supabase';
import type { MenuItem } from '@/lib/menu';

/** A row of prep_tasks. */
export interface PrepTask {
  id: string;
  mother_id: string;
  menu_item_id: string;
  assignee_id: string | null;
  done: boolean;
}

/** A volunteer's own task, as my_prep_tasks() returns it. */
export interface MyPrepTask {
  task_id: string;
  done: boolean;
  item_name: string;
  unit: string;
  per_meal: number;
  mother_name: string;
  delivery_date: string | null;
  delivery_status: string;
}

type Result<T> = { data: T; error: null } | { data: null; error: string };
const OFFLINE = 'אין חיבור לאינטרנט';

/** All tasks (manager). */
export async function loadAllPrep(): Promise<Result<PrepTask[]>> {
  try {
    const { data, error } = await fetchAll<PrepTask>((from, to) =>
      supabase.from('prep_tasks').select('id, mother_id, menu_item_id, assignee_id, done')
        .order('id').range(from, to));
    if (error) {
      console.error('[loadAllPrep]', error.message);
      return { data: null, error: 'טעינת ההכנות נכשלה' };
    }
    return { data, error: null };
  } catch {
    return { data: null, error: OFFLINE };
  }
}

/** One meal's tasks (manager). */
export async function loadPrepFor(motherId: string): Promise<Result<PrepTask[]>> {
  try {
    const { data, error } = await supabase.from('prep_tasks')
      .select('id, mother_id, menu_item_id, assignee_id, done').eq('mother_id', motherId);
    if (error) {
      console.error('[loadPrepFor]', error.message);
      return { data: null, error: 'טעינת ההכנות נכשלה' };
    }
    return { data: data as PrepTask[], error: null };
  } catch {
    return { data: null, error: OFFLINE };
  }
}

/** The signed-in user's own open tasks. */
export async function loadMyPrep(): Promise<Result<MyPrepTask[]>> {
  try {
    const { data, error } = await supabase.rpc('my_prep_tasks');
    if (error) {
      console.error('[loadMyPrep]', error.code, error.message);
      return { data: null, error: 'טעינת ההכנות נכשלה' };
    }
    return { data: (data ?? []) as MyPrepTask[], error: null };
  } catch {
    return { data: null, error: OFFLINE };
  }
}

/** Make sure a meal has a task for every active menu item (manager). */
export async function ensurePrepTasks(motherId: string, items: MenuItem[]): Promise<{ error: string | null }> {
  const rows = items.filter(i => i.is_active).map(i => ({ mother_id: motherId, menu_item_id: i.id }));
  if (!rows.length) return { error: null };
  try {
    const { error } = await supabase.from('prep_tasks')
      .upsert(rows, { onConflict: 'mother_id,menu_item_id', ignoreDuplicates: true });
    if (error) {
      console.error('[ensurePrepTasks]', error.code, error.message);
      return { error: 'יצירת רשימת ההכנות נכשלה' };
    }
    return { error: null };
  } catch {
    return { error: OFFLINE };
  }
}

/** Assign tasks to a person (null = nobody). Manager only. */
export async function assignPrep(taskIds: string[], assigneeId: string | null): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.from('prep_tasks')
      .update({ assignee_id: assigneeId }).in('id', taskIds).select('id');
    if (error || (data?.length ?? 0) !== taskIds.length) {
      if (error) console.error('[assignPrep]', error.code, error.message);
      return { error: 'השיבוץ נכשל' };
    }
    return { error: null };
  } catch {
    return { error: OFFLINE };
  }
}

/** Tick / untick — the task's assignee or the manager. */
export async function setPrepDone(taskId: string, done: boolean): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.rpc('set_prep_done', { p_task_id: taskId, p_done: done });
    if (error) {
      console.error('[setPrepDone]', error.code, error.message);
      return { error: 'העדכון נכשל' };
    }
    return { error: null };
  } catch {
    return { error: OFFLINE };
  }
}
