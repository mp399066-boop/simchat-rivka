'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { CATEGORY_INFO, type Category } from '@/lib/categories';
import { colors as C } from '@/lib/theme';

/** Inside a category: its list, its prep (kitchen sheet) and its menu & stock. */
export default function CategoryTabs({ category }: { category: Category }) {
  const pathname = usePathname();
  const info = CATEGORY_INFO[category];
  const tabs = [
    { href: info.base,           label: info.listLabel, icon: info.icon },
    { href: `${info.base}/prep`, label: 'הכנות',        icon: 'chef' as const },
    { href: `${info.base}/menu`, label: 'תפריט ומלאי',  icon: 'list' as const },
  ];

  return (
    <nav className="no-print" aria-label={info.label} style={{
      display: 'flex', gap: 4, backgroundColor: C.card, padding: 5, borderRadius: 999, alignSelf: 'flex-start',
      border: `1px solid ${C.border}`, boxShadow: C.shadow, maxWidth: '100%', overflowX: 'auto',
    }}>
      {tabs.map(t => {
        const active = pathname === t.href;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined} style={{
            minHeight: 42, padding: '6px 16px', borderRadius: 999, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap',
            backgroundColor: active ? C.accent : 'transparent',
            color: active ? '#FFFFFF' : C.sub,
          }}>
            <Icon name={t.icon} size={17} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
