'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadMothers, loadTeam } from '@/lib/mothersData';
import type { Mother } from '@/lib/mothers';
import type { AuthorizedUser } from '@/lib/users';

export type MothersState =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; mothers: Mother[]; team: AuthorizedUser[] };

async function fetchState(isAdmin: boolean): Promise<MothersState> {
  const [mothers, team] = await Promise.all([
    loadMothers(),
    isAdmin ? loadTeam() : Promise.resolve({ data: [] as AuthorizedUser[], error: null }),
  ]);
  if (mothers.error !== null) return { state: 'error', message: mothers.error };
  // The team list only fills in names; the page still works without it.
  return { state: 'ready', mothers: mothers.data, team: team.data ?? [] };
}

/**
 * Mothers visible to the signed-in user (RLS decides which), plus — for the
 * manager — the team, to show and assign volunteers.
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
