import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/layout/AppShell';
import { FeedbackProvider } from '@/components/ui/Feedback';
import StatusMessage from '@/components/ui/StatusMessage';

const rubik = Rubik({
  variable: '--font-rubik',
  subsets: ['hebrew', 'latin'],
});

export const metadata: Metadata = {
  title: 'שמחת רבקה – ארוחות ליולדות',
  description: 'מערכת ניהול ארוחות ליולדות – ארגון שמחת רבקה',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#C8155B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body>
        <FeedbackProvider>
          {/* AppShell reads the pathname; with Cache Components that can
              suspend on routes with dynamic params, so it needs a boundary. */}
          <Suspense fallback={<StatusMessage fullPage title="טוען..." />}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </FeedbackProvider>
      </body>
    </html>
  );
}
