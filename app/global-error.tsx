'use client'; // Error boundaries must be Client Components

import StatusMessage from '@/components/ui/StatusMessage';
import { buttonStyle } from '@/lib/theme';

/**
 * Last-resort screen when the root layout itself fails. It replaces the whole
 * document, so it brings its own <html>/<body> and uses inline styles only.
 */
export default function GlobalError({ retry }: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <title>שגיאה – שמחת רבקה</title>
        <StatusMessage fullPage title="המערכת נתקלה בשגיאה" text="הנתונים שמורים. נסי שוב בעוד רגע.">
          <button onClick={() => retry()} style={buttonStyle('primary')}>נסי שוב</button>
        </StatusMessage>
      </body>
    </html>
  );
}
