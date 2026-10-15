'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/supabase';

export type TzintukStatus = 'loading' | 'error' | 'on' | 'off';

/**
 * Is a phone line connected for צינתוק, and how many units are left on it?
 * (manager only; the answer comes from the server). Status 'loading' until
 * known, 'error' if the check failed; units null when unknown.
 */
export function useTzintukStatus(enabled: boolean): { status: TzintukStatus; units: number | null } {
  const [state, setState] = useState<{ status: TzintukStatus; units: number | null }>({ status: 'loading', units: null });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    authFetch('/api/tzintuk/send')
      .then(async res => {
        if (!res.ok) return { status: 'error' as const, units: null };
        const body = await res.json();
        return {
          status: body.configured ? 'on' as const : 'off' as const,
          units: typeof body.units === 'number' ? body.units : null,
        };
      })
      .catch(() => ({ status: 'error' as const, units: null }))
      .then(s => { if (!cancelled) setState(s); });
    return () => { cancelled = true; };
  }, [enabled]);
  return state;
}
