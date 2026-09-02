import { Button, Icon, MoneyInput, Select } from '@/components/ui';
import { useMoney } from '@/hooks/useMoney';
import type { SplitController } from '@/hooks/useSplit';
import type { SplitProblem } from '@/lib/bank';
import type { Category } from '@/types';

interface SplitEditorProps {
  split: SplitController;
  totalCents: number;
  categories: readonly Category[];
}

/**
 * The rows of one expense split across categories.
 *
 * Presentational on purpose: all the state lives in `useSplit`, so the review
 * inbox and the add-expense form drive the same editor and get the same
 * behaviour, while each keeps its own submit button and its own idea of what
 * filing means.
 */
export default function SplitEditor({ split, totalCents, categories }: SplitEditorProps) {
  const { format } = useMoney();
  const { parts, problem } = split;

  return (
    <div className="border-border-subtle flex flex-col gap-2 rounded-lg border border-dashed p-3">
      {parts.map((part, index) => (
        <div key={part.key} className="flex items-center gap-2">
          <Select
            aria-label={`Category for part ${index + 1}`}
            className="min-w-0 flex-1"
            value={part.categoryId}
            placeholder="Choose a category"
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
            onChange={(event) => split.setPart(part.key, { categoryId: event.target.value })}
          />
          <div className="w-24 shrink-0">
            <MoneyInput
              valueCents={part.amountCents}
              onChange={(amountCents) => split.setPart(part.key, { amountCents })}
            />
          </div>
          {/* Below three parts there is nothing to remove — a split is at least
              two, and removing one of two is just cancelling. */}
          {parts.length > 2 && (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              aria-label={`Remove part ${index + 1}`}
              onClick={() => split.removePart(part.key)}
            >
              <Icon name="dismiss" />
            </Button>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-content-muted text-xs" role="status">
          {describe(problem, format) ?? `Splits ${format(totalCents)} exactly.`}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {parts.length < categories.length && (
            <Button size="sm" variant="ghost" onClick={split.addPart}>
              <Icon name="add" />
              Category
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={split.even}>
            Even
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The one place a split problem becomes a sentence, and money becomes currency. */
function describe(
  problem: SplitProblem | null,
  format: (cents: number) => string,
): string | null {
  if (!problem) return null;

  switch (problem.kind) {
    case 'too-few':
      return 'A split needs at least two categories.';
    case 'missing-category':
      return 'Every part needs a category.';
    case 'non-positive':
      return 'Every part needs an amount.';
    case 'duplicate-category':
      return 'Two parts share a category — combine them instead.';
    case 'unassigned':
      return problem.differenceCents > 0
        ? `${format(problem.differenceCents)} still to assign.`
        : `${format(-problem.differenceCents)} over the amount.`;
  }
}
