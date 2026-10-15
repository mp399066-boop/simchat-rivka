'use client';

import Icon from '@/components/ui/Icon';
import { LOW_TZINTUK_UNITS } from '@/lib/actions';
import { useTzintukStatus } from '@/lib/useTzintuk';
import { card, colors as C } from '@/lib/theme';

/** Whether צינתוק is connected to a phone line (manager). */
export default function TzintukSettingsCard() {
  const { status, units } = useTzintukStatus(true);
  const on = status === 'on';
  return (
    <section style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{
        width: 50, height: 50, borderRadius: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: on ? '#DCFCE7' : C.accentSub, color: on ? C.success : C.accent,
      }}>
        <Icon name="phone" size={24} />
      </span>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>צינתוק ליולדות</h2>
        <div style={{ fontSize: 14, color: C.sub, marginTop: 2 }}>
          {status === 'loading' && 'בודקת...'}
          {status === 'error' && 'לא הצלחנו לבדוק את מצב הצינתוק'}
          {on && 'פעיל: צינתוק אוטומטי ליולדת בערב שלפני המשלוח ובבוקר של יום המשלוח. בכרטיס של כל יולדת יש גם כפתור צינתוק.'}
          {on && units !== null && (
            <div style={{ marginTop: 4, fontWeight: 700, color: units < LOW_TZINTUK_UNITS ? '#B45309' : C.text }}>
              נשארו {units} יחידות בימות המשיח (צינתוק = 0.1 יחידה)
              {units < LOW_TZINTUK_UNITS && ' – כדאי לטעון'}
            </div>
          )}
          {status === 'off' && 'עוד לא מחובר קו טלפון. כשיחובר – יישלח צינתוק אוטומטי בערב שלפני ובבוקר המשלוח, ויופיע כפתור צינתוק בכרטיס היולדת.'}
        </div>
      </div>
    </section>
  );
}
