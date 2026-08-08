import { useMoney } from '@/hooks/useMoney';
import { useAllocationStatus } from '@/hooks/useCategories';
import { formatPercentBp } from '@/lib/validation';
import type { MonthComputation } from '@/types';

interface AllocationSummaryProps {
  computation: MonthComputation;
}

/**
 * The running total of percentage allocations, so an unbalanced split is
 * obvious while editing rather than a surprise on the dashboard.
 */
export default function AllocationSummary({ computation }: AllocationSummaryProps) {
  const { format } = useMoney();
  const allocation = useAllocationStatus();

  const tone = allocation.isBalanced
    ? 'border-positive/40 bg-positive-soft'
    : 'border-warning/40 bg-warning-soft';

  return (
    <div className={`rounded-card border p-4 ${tone}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-content text-sm font-semibold">
          Percentages total {formatPercentBp(allocation.percentTotalBp)}
        </span>
        <span className="text-content-muted text-sm">
          {format(computation.fixedTotalCents)} fixed &middot;{' '}
          {format(computation.percentPoolCents)} left to split
        </span>
      </div>
      {!allocation.isBalanced && (
        <p className="text-content-muted mt-1 text-sm">
          {allocation.remainderBp > 0
            ? `${formatPercentBp(allocation.remainderBp)} of the remainder is unassigned — that money is not budgeted anywhere.`
            : `You are over by ${formatPercentBp(-allocation.remainderBp)}. Percentages are still split proportionally, but the totals will not match your intent.`}
        </p>
      )}
    </div>
  );
}
