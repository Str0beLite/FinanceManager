import { Badge, Button, Icon } from '@/components/ui';
import type { MonthView } from '@/hooks/useMonth';
import { useMoney } from '@/hooks/useMoney';
import { formatMonthLabel } from '@/lib/dates';

interface MonthSummaryRowProps {
  view: MonthView;
  onOpen: () => void;
  onClose: () => void;
  onReopen: () => void;
}

export default function MonthSummaryRow({
  view,
  onOpen,
  onClose,
  onReopen,
}: MonthSummaryRowProps) {
  const { format, formatSigned } = useMoney();
  const { computation, record, isClosed, canClose, canReopen } = view;
  const delta = computation.totalRemainingCents;

  return (
    <li className="border-border-subtle flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      {/* The whole summary opens the month, rather than just the month name —
          a two-line block is a thumb-sized target; a text link is not. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${formatMonthLabel(view.monthKey)}`}
        className="group -m-1 min-w-0 flex-1 rounded-md p-1 text-left"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-content group-hover:text-brand text-sm font-semibold">
            {formatMonthLabel(view.monthKey)}
          </span>
          {isClosed ? (
            <Badge>
              <Icon name="closed" className="text-[0.65em]" /> Closed
            </Badge>
          ) : (
            <Badge tone="brand">Open</Badge>
          )}
          {record.deficitInCents > 0 && (
            <Badge tone="warning">−{format(record.deficitInCents)} carried in</Badge>
          )}
          {record.poolAppliedCents > 0 && (
            <Badge tone="positive">{format(record.poolAppliedCents)} from savings</Badge>
          )}
        </span>
        <span className="text-content-muted mt-1 block text-xs">
          {format(computation.totalSpentCents)} spent of{' '}
          {format(computation.totalBudgetCents)} budgeted
          {computation.unabsorbedDeficitCents > 0 &&
            ` · ${format(computation.unabsorbedDeficitCents)} rolls on`}
        </span>
      </button>

      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-semibold tabular-nums ${
            delta >= 0 ? 'text-positive' : 'text-danger'
          }`}
          title={delta >= 0 ? 'Added to the rollover pool' : "Charged to the next month"}
        >
          {formatSigned(delta)}
        </span>
        {canClose && (
          <Button size="sm" variant="primary" onClick={onClose}>
            Close
          </Button>
        )}
        {canReopen && (
          <Button size="sm" variant="ghost" onClick={onReopen}>
            Reopen
          </Button>
        )}
      </div>
    </li>
  );
}
