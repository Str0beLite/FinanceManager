import AllocationBar from '@/components/charts/AllocationBar';
import { Button, ProgressBar } from '@/components/ui';
import { useMoney } from '@/hooks/useMoney';
import type { MonthComputation } from '@/types';

interface MonthHeroProps {
  computation: MonthComputation;
  poolCents: number;
  isClosed: boolean;
  canClose: boolean;
  onCloseMonth: () => void;
}

/**
 * The mobile summary. Where desktop shows four equal tiles, a phone gets one
 * answer at a glance — how much is left — with everything else supporting it.
 */
export default function MonthHero({
  computation,
  poolCents,
  isClosed,
  canClose,
  onCloseMonth,
}: MonthHeroProps) {
  const { format } = useMoney();
  const remaining = computation.totalRemainingCents;
  const isOver = remaining < 0;
  const usage =
    computation.totalBudgetCents > 0
      ? computation.totalSpentCents / computation.totalBudgetCents
      : 0;

  return (
    <section className="bg-surface-raised border-border-subtle rounded-card flex flex-col gap-3 border p-4 sm:hidden">
      <div>
        <p className="text-content-muted text-xs font-medium tracking-wide uppercase">
          {isOver ? 'Over budget' : 'Left to spend'}
        </p>
        <p
          className={`mt-0.5 text-4xl font-semibold tabular-nums ${
            isOver ? 'text-danger' : 'text-positive'
          }`}
        >
          {format(Math.abs(remaining))}
        </p>
      </div>

      <ProgressBar ratio={usage} label="Total spending this month" />

      <p className="text-content-muted text-xs">
        {format(computation.totalSpentCents)} spent of {format(computation.totalBudgetCents)}
        {computation.deficitAppliedCents > 0 && (
          <span className="text-warning">
            {' '}
            · {format(computation.deficitAppliedCents)} rollover cut
          </span>
        )}
        {computation.totalPooledCents > 0 && (
          <span className="text-brand">
            {' '}
            · {format(computation.totalPooledCents)} from savings
          </span>
        )}
      </p>

      <AllocationBar
        segments={computation.categories.map((category) => ({
          id: category.categoryId,
          label: `${category.name}: ${format(category.budgetCents)}`,
          color: category.color,
          valueCents: category.budgetCents,
        }))}
      />

      <div className="border-border-subtle flex items-center justify-between gap-3 border-t pt-3">
        <div>
          <p className="text-content-muted text-[10px] font-medium tracking-wide uppercase">
            Income
          </p>
          <p className="text-content text-sm font-semibold tabular-nums">
            {format(computation.incomeCents)}
          </p>
        </div>
        <div>
          <p className="text-content-muted text-[10px] font-medium tracking-wide uppercase">
            Pool
          </p>
          <p
            className={`text-sm font-semibold tabular-nums ${
              poolCents < 0 ? 'text-danger' : 'text-brand'
            }`}
          >
            {format(poolCents)}
          </p>
        </div>
        {!isClosed && (
          <Button
            size="sm"
            variant={canClose ? 'primary' : 'secondary'}
            disabled={!canClose}
            onClick={onCloseMonth}
          >
            Close month
          </Button>
        )}
      </div>
    </section>
  );
}
