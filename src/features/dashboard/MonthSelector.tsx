import { Badge, Button, Icon } from '@/components/ui';
import { formatMonthLabel, monthKeyOf, nextMonthKey, prevMonthKey } from '@/lib/dates';

interface MonthSelectorProps {
  monthKey: string;
  onSelect: (key: string) => void;
  isClosed: boolean;
}

export default function MonthSelector({ monthKey, onSelect, isClosed }: MonthSelectorProps) {
  const isCurrentMonth = monthKey === monthKeyOf();

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Full width on a phone so the arrows sit at the screen edges, in thumb reach. */}
      <div className="border-border-subtle bg-surface-raised flex w-full items-center justify-between gap-1 rounded-lg border p-1 sm:w-auto sm:justify-start">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onSelect(prevMonthKey(monthKey))}
          className="text-content-muted active:bg-surface-muted hover:text-content flex size-10 items-center justify-center rounded-md text-sm sm:size-8"
        >
          <Icon name="previous" />
        </button>
        {/* The arrows keep focus, so the label changing is the only feedback a
            screen reader would otherwise get. Announce it. */}
        <span
          id="current-month"
          aria-live="polite"
          className="text-content text-center text-sm font-semibold sm:min-w-40"
        >
          {formatMonthLabel(monthKey)}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onSelect(nextMonthKey(monthKey))}
          className="text-content-muted active:bg-surface-muted hover:text-content flex size-10 items-center justify-center rounded-md text-sm sm:size-8"
        >
          <Icon name="next" />
        </button>
      </div>

      {isClosed && <Badge tone="neutral"><Icon name="closed" className="text-[0.65em]" /> Closed</Badge>}
      {!isCurrentMonth && (
        <Button size="sm" variant="ghost" onClick={() => onSelect(monthKeyOf())}>
          Back to this month
        </Button>
      )}
    </div>
  );
}
