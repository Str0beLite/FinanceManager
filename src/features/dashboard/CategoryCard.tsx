import { Badge, ProgressBar } from '@/components/ui';
import { useMoney } from '@/hooks/useMoney';
import type { CategoryComputation } from '@/types';

interface CategoryCardProps {
  category: CategoryComputation;
  onAddSpending?: (categoryId: string) => void;
}

export default function CategoryCard({ category, onAddSpending }: CategoryCardProps) {
  const { format } = useMoney();
  const isOver = category.remainingCents < 0;

  return (
    <article className="bg-surface-raised border-border-subtle rounded-card flex flex-col gap-3 border p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <h3 className="text-content truncate text-sm font-semibold">{category.name}</h3>
        </div>
        {category.hardSet && (
          <Badge tone="brand" title="Hard set — never reduced by a rollover deficit">
            🔒 Hard set
          </Badge>
        )}
      </header>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-content text-xl font-semibold tabular-nums">
          {format(category.spentCents)}
        </span>
        <span className="text-content-muted text-sm tabular-nums">
          of {format(category.budgetCents)}
        </span>
      </div>

      <ProgressBar
        ratio={category.usageRatio}
        color={category.color}
        label={`${category.name} spending`}
      />

      <footer className="flex items-center justify-between gap-2 text-xs">
        <span className={isOver ? 'text-danger font-medium' : 'text-content-muted'}>
          {isOver
            ? `${format(-category.remainingCents)} over`
            : `${format(category.remainingCents)} left`}
        </span>

        <div className="flex items-center gap-2">
          {category.cutCents > 0 && (
            <span className="text-warning" title="Reduced to cover last month's overspend">
              −{format(category.cutCents)}
            </span>
          )}
          {onAddSpending && (
            <button
              type="button"
              onClick={() => onAddSpending(category.categoryId)}
              className="text-brand hover:text-brand-strong font-medium"
            >
              + Add
            </button>
          )}
        </div>
      </footer>

      {category.subscriptionCents > 0 && (
        <p className="text-content-muted border-border-subtle border-t pt-2 text-xs">
          Includes {format(category.subscriptionCents)} of subscriptions
        </p>
      )}
    </article>
  );
}
