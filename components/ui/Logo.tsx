import Image from 'next/image';

/**
 * The שמחת רבקה logo. variant 'mark' = the lotus only (menus, small spaces);
 * 'full' = lotus + organization name (login screen).
 */
export default function Logo({ size = 32, variant = 'mark' }: { size?: number; variant?: 'mark' | 'full' }) {
  return (
    <Image
      src={variant === 'full' ? '/logo-full.png' : '/logo-mark.png'}
      alt="ארגון שמחת רבקה"
      width={size}
      height={size}
      priority={variant === 'full'}
      style={{ display: 'block' }}
    />
  );
}
