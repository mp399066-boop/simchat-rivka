import Link from 'next/link';
import StatusMessage from '@/components/ui/StatusMessage';
import { buttonStyle } from '@/lib/theme';

export default function NotFound() {
  return (
    <StatusMessage title="הדף לא נמצא" text="ייתכן שהקישור שגוי, או שהרשומה נמחקה.">
      <Link href="/" style={buttonStyle('primary')}>חזרה לדף הבית</Link>
    </StatusMessage>
  );
}
