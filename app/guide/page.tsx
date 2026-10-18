'use client';

import Link from 'next/link';
import Icon, { type IconName } from '@/components/ui/Icon';
import PageHero from '@/components/ui/PageHero';
import { STATUS_COLORS, STATUS_LABELS, type DeliveryStatus } from '@/lib/mothers';
import { card, colors as C } from '@/lib/theme';

/** How the work goes, step by step — the manager runs everything here. */

interface Step { icon: IconName; title: string; text: string; href?: string; link?: string }

const STEPS: Step[] = [
  { icon: 'sparkle', title: 'שלוש קטגוריות', href: '/weddings', link: 'חתונות',
    text: 'יולדות, חתונות ושמחות – לכל אחת לשונית משלה, ובתוכה הרשימה, ההכנות והתפריט והמלאי שלה. ארוחה לזוג צעיר או לשמחה עוברת את אותו מסלול כמו ארוחה ליולדת, והמלאי שלה נפרד. בתפריט ריק של חתונות או שמחות אפשר להתחיל מהעתק של תפריט היולדות.' },
  { icon: 'heart', title: '1. יולדת חדשה', href: '/mothers', link: 'יולדות',
    text: 'מוסיפים שם, טלפון, כתובת ותאריך לידה (בלוח העברי). תאריך המשלוח מחושב לבד – שבוע או שבועיים אחרי הלידה, לא בשבת ולא ביום טוב. אם יש לה מייל – ערב לפני היא מקבלת תזכורת עם כפתור "ראיתי".' },
  { icon: 'check', title: '2. מה מוכן לארוחה', href: '/', link: 'דף הבית',
    text: 'לכל ארוחה יש רשימת סימון: לחמניות, פשטידה, קינוח... מסמנים ✓ על מה שמוכן. אם מישהי מכינה משהו בשבילה (למשל פשטידה) – אפשר לרשום מי.' },
  { icon: 'list', title: '3. מה להכין ולקנות', href: '/mothers/menu', link: 'תפריט ומלאי',
    text: 'דף הבית אומר מה להוציא מהפריזר, מה להכין ומה לקנות לשבוע הקרוב, לכל קטגוריה בנפרד. בתפריט ומלאי של כל קטגוריה מעדכנים כמה יש.' },
  { icon: 'truck', title: '4. שולחים', href: '/', link: 'דף הבית',
    text: 'בטבלה "איפה כל ארוחה עומדת" יש כפתור לשלב הבא: נארז ← יצא ← נמסר. כשמסמנים "נארז" – המלאי יורד לבד.' },
  { icon: 'alert', title: 'כל בוקר', href: '/', link: 'דף הבית',
    text: '"מה צריך לעשות" בדף הבית מראה מה פתוח: יולדת שביקשה שינוי, לוודא שהיולדת בבית מחר, תאריך שעבר. כל שורה – כפתור שמוביל ישר לטיפול.' },
];

const FLOW: DeliveryStatus[] = ['planned', 'preparing', 'ready', 'out', 'delivered'];
const FLOW_HINT: Record<DeliveryStatus, string> = {
  planned:   'נקבע תאריך',
  preparing: 'לבד – כשמסמנים ✓ ראשון ב"מה מוכן"',
  ready:     'הארוחה ארוזה (המלאי יורד)',
  out:       'המתנדבת יצאה',
  delivered: 'נמסר ליולדת',
  cancelled: '',
};

export default function GuidePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero title="איך עובדים" subtitle="המסלול של כל ארוחה – מהרישום ועד המסירה" />

      <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={h2}>המצבים של משלוח</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {FLOW.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ borderRadius: 16, padding: '8px 12px', backgroundColor: STATUS_COLORS[s].bg, minWidth: 110 }}>
                <div style={{ fontWeight: 800, color: STATUS_COLORS[s].text }}>{STATUS_LABELS[s]}</div>
                <div style={{ fontSize: 12, color: C.sub }}>{FLOW_HINT[s]}</div>
              </div>
              {i < FLOW.length - 1 && <span style={{ color: C.muted, fontSize: 20 }}>←</span>}
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 14 }}>
        {STEPS.map(step => (
          <section key={step.title} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={h2}>
              <span style={{
                width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: C.accentSub, color: C.accent, flexShrink: 0,
              }}><Icon name={step.icon} size={20} /></span>
              {step.title}
            </h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: C.text }}>{step.text}</p>
            {step.href && (
              <Link href={step.href} style={{ color: C.accent, fontWeight: 700, fontSize: 14 }}>למסך {step.link} ←</Link>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

const h2 = { fontSize: 18, fontWeight: 800, color: C.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 } as const;
