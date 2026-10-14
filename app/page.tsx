'use client';

import Link from 'next/link';
import { useMe } from '@/components/layout/AppShell';
import { ROLE_LABELS } from '@/lib/users';
import { buttonStyle, colors as C } from '@/lib/theme';

/** Coming next — replaced by the real "today & tomorrow" board in stage 4. */
const ROADMAP = [
  'יולדות ומשלוחים',
  'תפריט ורשימת הכנות לכל ארוחה',
  'חוסרים ומסך "היום ומחר"',
  'סימון מסירה מהטלפון',
  'תזכורות יום לפני המשלוח',
];

export default function HomePage() {
  const me = useMe();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={card}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>
          שלום{me.fullName ? ` ${me.fullName}` : ''}
        </h1>
        <p style={{ fontSize: 15, color: C.sub, margin: '6px 0 0' }}>
          נכנסת כ{ROLE_LABELS[me.role]} למערכת ארוחות ליולדות של ארגון שמחת רבקה.
        </p>
        {me.role === 'admin' && (
          <div style={{ marginTop: 16 }}>
            <Link href="/users" style={buttonStyle('primary')}>ניהול משתמשות</Link>
          </div>
        )}
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>בקרוב במערכת</h2>
        <ul style={{ margin: 0, paddingInlineStart: 20, color: C.sub, fontSize: 15, lineHeight: 1.9 }}>
          {ROADMAP.map(item => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </div>
  );
}

const card = {
  backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
  padding: 20, boxShadow: C.shadow,
} as const;
