import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, type IconName } from '@/config/icons';

interface IconProps {
  name: IconName;
  className?: string;
  /**
   * Text for screen readers. Omit it — the default — when nearby text already
   * says the same thing, and the icon is hidden from assistive tech instead.
   */
  label?: string;
}

/** The only component that touches the icon library directly. */
export default function Icon({ name, className, label }: IconProps) {
  return (
    <FontAwesomeIcon
      icon={ICONS[name]}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
