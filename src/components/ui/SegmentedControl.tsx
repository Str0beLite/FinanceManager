import type { IconName } from '@/config/icons';
import Icon from './Icon';

export interface Segment<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: IconName;
}

interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, e.g. "Plan section". */
  label: string;
}

/**
 * A row of mutually exclusive choices, for switching between views of the same
 * screen. Use it where a tab would be overkill — it costs no navigation state
 * and both options stay visible.
 */
export default function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="border-border-subtle bg-surface-muted grid gap-1 rounded-lg border p-1"
      style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
    >
      {segments.map((segment) => {
        const isActive = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(segment.value)}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-surface-raised text-content shadow-sm'
                : 'text-content-muted active:bg-surface-raised/60'
            }`}
          >
            {segment.icon && <Icon name={segment.icon} className="text-xs" />}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
