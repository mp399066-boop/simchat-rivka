'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import StatusMessage from '@/components/ui/StatusMessage';
import { buttonStyle } from '@/lib/theme';

/** Shown instead of a page that crashed while rendering; the top bar stays. */
export default function Error({ error, retry }: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[page error]', error.digest ?? '', error.message);
  }, [error]);

  return (
    <StatusMessage
      title="משהו השתבש בטעינת הדף"
      text="הנתונים שמורים. אפשר לנסות שוב, ואם הבעיה חוזרת – לרענן את הדף."
    >
      <button onClick={() => retry()} style={buttonStyle('primary')}>נסי שוב</button>
      <Link href="/" style={buttonStyle('secondary')}>חזרה לדף הבית</Link>
    </StatusMessage>
  );
}
