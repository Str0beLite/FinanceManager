import { Button, StatTile } from '@/components/ui';
import { useMoney } from '@/hooks/useMoney';
import type { MonthComputation } from '@/types';

interface MonthStatsProps {
  computation: MonthComputation;
  poolCents: number;
  isClosed: boolean;
  onCloseMonth: () => void;
  canClose: boolean;
}

export default function MonthStats({
  computation,
  poolCents,
  isClosed,
  onCloseMonth,
  canClose,
}: MonthStatsProps) {
  const { format } = useMoney();
  const remaining = computation.totalRemainingCents;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Income"
        value={format(computation.incomeCents)}
        hint={
          computation.extraIncomeCents > 0
            ? `Includes ${format(computation.extraIncomeCents)} extra`
            : 'Monthly paycheck'
        }
      />
      <StatTile
        label="Budgeted"
        value={format(computation.totalBudgetCents)}
        hint={
          computation.deficitAppliedCents > 0
            ? `After a ${format(computation.deficitAppliedCents)} rollover cut`
            : 'Across all categories'
        }
        tone={computation.deficitAppliedCents > 0 ? 'warning' : 'neutral'}
      />
      <StatTile
        label={remaining >= 0 ? 'Left to spend' : 'Over budget'}
        value={format(Math.abs(remaining))}
        hint={`${format(computation.totalSpentCents)} spent so far`}
        tone={remaining >= 0 ? 'positive' : 'danger'}
      />
      <StatTile
        label="Rollover pool"
        value={format(poolCents)}
        hint="Savings from months that came in under"
        tone="brand"
        action={
          !isClosed && (
            <Button
              size="sm"
              variant={canClose ? 'primary' : 'secondary'}
              disabled={!canClose}
              onClick={onCloseMonth}
              title={
                canClose
                  ? 'Settle this month and carry the result forward'
                  : 'Close the earlier open months first'
              }
            >
              Close month
            </Button>
          )
        }
      />
    </div>
  );
}
