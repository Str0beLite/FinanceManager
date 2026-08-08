import { Badge, Button } from '@/components/ui';
import { formatMonthLabel, monthKeyOf, nextMonthKey, prevMonthKey } from '@/lib/dates';

interface MonthSelectorProps {
  monthKey: string;
  onSelect: (key: string) => void;
  isClosed: boolean;
}

export default function MonthSelector({ monthKey, onSelect, isClosed }: MonthSelectorProps) {
  const isCurrentMonth = monthKey === monthKeyOf();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="border-border-subtle bg-surface-raised flex items-center gap-1 rounded-lg border p-1">
        <Button
          size="sm"
          variant="ghost"
          aria-label="Previous month"
          onClick={() => onSelect(prevMonthKey(monthKey))}
        >
          ‹
        </Button>
        <span className="text-content min-w-40 text-center text-sm font-semibold">
          {formatMonthLabel(monthKey)}
        </span>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Next month"
          onClick={() => onSelect(nextMonthKey(monthKey))}
        >
          ›
        </Button>
      </div>

      {isClosed && <Badge tone="neutral">🔒 Closed</Badge>}
      {!isCurrentMonth && (
        <Button size="sm" variant="ghost" onClick={() => onSelect(monthKeyOf())}>
          Back to this month
        </Button>
      )}
    </div>
  );
}
