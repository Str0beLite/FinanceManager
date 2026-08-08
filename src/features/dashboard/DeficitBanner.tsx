import { Button } from '@/components/ui';
import { useMoney } from '@/hooks/useMoney';
import { prevMonthKey, formatMonthLabel } from '@/lib/dates';
import type { MonthComputation } from '@/types';

interface DeficitBannerProps {
  computation: MonthComputation;
  poolCents: number;
  onApplyPool: () => void;
  readOnly: boolean;
}

/**
 * Explains, in plain words, why this month's budget is smaller than usual —
 * and offers the one escape hatch: paying the deficit out of savings.
 */
export default function DeficitBanner({
  computation,
  poolCents,
  onApplyPool,
  readOnly,
}: DeficitBannerProps) {
  const { format } = useMoney();
  if (computation.deficitInCents <= 0) return null;

  const cutCategories = computation.categories.filter((c) => c.cutCents > 0);
  const sparedCategories = computation.categories.filter((c) => c.hardSet);
  const canUsePool = !readOnly && poolCents > 0;

  return (
    <div className="border-warning/40 bg-warning-soft rounded-card border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-content text-sm font-semibold">
            {format(computation.deficitInCents)} carried over from{' '}
            {formatMonthLabel(prevMonthKey(computation.monthKey))}
          </h2>
          <p className="text-content-muted mt-1 text-sm">
            {cutCategories.length > 0 ? (
              <>
                Taken out of{' '}
                <span className="text-content font-medium">
                  {cutCategories.map((c) => c.name).join(', ')}
                </span>
                {sparedCategories.length > 0 && (
                  <>
                    {' '}
                    — {sparedCategories.map((c) => c.name).join(', ')}{' '}
                    {sparedCategories.length === 1 ? 'is' : 'are'} hard set and untouched
                  </>
                )}
                .
              </>
            ) : (
              'No flexible category had budget left to absorb it, so it rolls on again next month.'
            )}
          </p>
          {computation.unabsorbedDeficitCents > 0 && (
            <p className="text-warning mt-1 text-xs font-medium">
              {format(computation.unabsorbedDeficitCents)} could not be absorbed and moves to
              next month.
            </p>
          )}
        </div>

        {canUsePool && (
          <Button size="sm" onClick={onApplyPool}>
            Pay {format(Math.min(poolCents, computation.deficitInCents))} from savings
          </Button>
        )}
      </div>
    </div>
  );
}
