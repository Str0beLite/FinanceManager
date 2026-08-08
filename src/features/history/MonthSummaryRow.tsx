import { Badge, Button } from '@/components/ui';
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
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="text-content hover:text-brand text-sm font-semibold"
          >
            {formatMonthLabel(view.monthKey)}
          </button>
          {isClosed ? <Badge>🔒 Closed</Badge> : <Badge tone="brand">Open</Badge>}
          {record.deficitInCents > 0 && (
            <Badge tone="warning">−{format(record.deficitInCents)} carried in</Badge>
          )}
          {record.poolAppliedCents > 0 && (
            <Badge tone="positive">{format(record.poolAppliedCents)} from savings</Badge>
          )}
        </div>
        <p className="text-content-muted mt-1 text-xs">
          {format(computation.totalSpentCents)} spent of{' '}
          {format(computation.totalBudgetCents)} budgeted
          {computation.unabsorbedDeficitCents > 0 &&
            ` · ${format(computation.unabsorbedDeficitCents)} rolls on`}
        </p>
      </div>

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
