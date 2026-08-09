import type { IconName } from '@/config/icons';
import Icon from './Icon';

interface FabProps {
  label: string;
  onClick: () => void;
  icon?: IconName;
}

/**
 * Mobile-only floating action button for a screen's primary action, parked
 * above the tab bar in thumb reach. Desktop keeps the header button instead.
 */
export default function Fab({ label, onClick, icon = 'add' }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="bg-brand active:bg-brand-strong fixed right-4 bottom-20 z-30 mb-safe flex size-14 items-center justify-center rounded-full text-xl leading-none text-white shadow-lg transition-colors sm:hidden"
    >
      <Icon name={icon} />
    </button>
  );
}
