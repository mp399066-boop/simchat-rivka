'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/supabase';

/**
 * Is a phone line connected for צינתוק? (manager only; the answer comes from
 * the server env). 'loading' until known, 'error' if the check failed.
 */
export function useTzintukStatus(enabled: boolean): 'loading' | 'error' | 'on' | 'off' {
  const [status, setStatus] = useState<'loading' | 'error' | 'on' | 'off'>('loading');
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    authFetch('/api/tzintuk/send')
      .then(async res => (res.ok ? ((await res.json()).configured ? 'on' as const : 'off' as const) : 'error' as const))
      .catch(() => 'error' as const)
      .then(s => { if (!cancelled) setStatus(s); });
    return () => { cancelled = true; };
  }, [enabled]);
  return status;
}
