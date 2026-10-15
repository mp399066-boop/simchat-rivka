import Icon, { type IconName } from '@/components/ui/Icon';
import { colors as C } from '@/lib/theme';

/** Round 44px icon-only button (edit / delete …); `label` is its accessible name. */
export default function IconButton({ label, icon, onClick, danger }: {
  label: string;
  icon: IconName;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} style={{
      width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: danger ? C.dangerSub : C.tile, color: danger ? C.danger : C.sub,
    }}>
      <Icon name={icon} size={18} />
    </button>
  );
}
