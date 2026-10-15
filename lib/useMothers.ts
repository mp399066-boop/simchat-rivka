'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadMothers, loadTeam } from '@/lib/mothersData';
import { loadAllPrep, type PrepTask } from '@/lib/prepData';
import type { Mother } from '@/lib/mothers';
import type { AuthorizedUser } from '@/lib/users';

export type MothersState =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; mothers: Mother[]; team: AuthorizedUser[]; prep: PrepTask[] };

async function fetchState(isAdmin: boolean): Promise<MothersState> {
  const [mothers, team, prep] = await Promise.all([
    loadMothers(),
    isAdmin ? loadTeam() : Promise.resolve({ data: [] as AuthorizedUser[], error: null }),
    isAdmin ? loadAllPrep() : Promise.resolve({ data: [] as PrepTask[], error: null }),
  ]);
  if (mothers.error !== null) return { state: 'error', message: mothers.error };
  // The team and the prep tasks only add details; the page still works without them.
  return { state: 'ready', mothers: mothers.data, team: team.data ?? [], prep: prep.data ?? [] };
}

/**
 * Mothers visible to the signed-in user (RLS decides which), plus — for the
 * manager — the team (to show and assign volunteers) and all prep tasks.
 */
export function useMothers(isAdmin: boolean) {
  const [data, setData] = useState<MothersState>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchState(isAdmin).then(s => { if (!cancelled) setData(s); });
    return () => { cancelled = true; };
  }, [isAdmin]);

  /** Load again (after a change). Keeps the current list on screen meanwhile. */
  const reload = useCallback(() => fetchState(isAdmin).then(setData), [isAdmin]);

  /** Retry after an error, showing the loading state. */
  const retry = useCallback(() => {
    setData({ state: 'loading' });
    return reload();
  }, [reload]);

  return { data, reload, retry };
}

/** id → display name of each team member. */
export function teamNames(team: AuthorizedUser[]): Map<string, string> {
  return new Map(team.map(u => [u.id, u.full_name || u.email]));
}

/** Done / total prep tasks per mother. */
export function prepProgress(prep: PrepTask[]): Map<string, { done: number; total: number }> {
  const map = new Map<string, { done: number; total: number }>();
  for (const t of prep) {
    const p = map.get(t.mother_id) ?? { done: 0, total: 0 };
    p.total++;
    if (t.done) p.done++;
    map.set(t.mother_id, p);
  }
  return map;
}
