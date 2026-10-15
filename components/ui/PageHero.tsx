import type { ReactNode } from 'react';
import Icon from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import { colors as C, heroGradient } from '@/lib/theme';

/**
 * The dark-berry banner at the top of each page: a small badge, a big title,
 * a subtitle and (optionally) the page's main action as a white pill.
 */
export default function PageHero({ title, subtitle, badge = 'ארגון שמחת רבקה', action }: {
  title: string;
  subtitle?: ReactNode;
  badge?: string;
  action?: ReactNode;
}) {
  return (
    <section className="hero" style={{
      position: 'relative', overflow: 'hidden', borderRadius: 28, background: heroGradient,
      color: '#FFFFFF', boxShadow: '0 18px 40px rgba(92,10,45,0.28)',
    }}>
      {/* decoration: soft circles + the logo, on the far (left) side */}
      <div aria-hidden style={{
        position: 'absolute', width: 260, height: 260, borderRadius: '50%', left: -60, top: -110,
        background: 'rgba(255,255,255,0.07)',
      }} />
      <div aria-hidden style={{
        position: 'absolute', width: 200, height: 200, borderRadius: '50%', left: 120, bottom: -120,
        background: 'rgba(255,255,255,0.06)',
      }} />
      <div aria-hidden className="hero-logo" style={{
        position: 'absolute', left: -26, bottom: -26, width: 150, height: 150, borderRadius: '50%',
        border: '6px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.95)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Logo size={92} />
      </div>

      <div className="hero-body" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{
          alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700,
          background: 'rgba(255,255,255,0.14)', color: '#FFE9F2',
        }}>
          <span style={{ color: C.gold, display: 'inline-flex' }}><Icon name="sparkle" size={15} /></span>
          {badge}
        </span>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800, lineHeight: 1.15 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{subtitle}</div>}
        {action && <div className="hero-action">{action}</div>}
      </div>
    </section>
  );
}
