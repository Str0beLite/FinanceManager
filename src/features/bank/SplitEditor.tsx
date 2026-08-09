import { useState } from 'react';
import { Button, Icon, MoneyInput, Select } from '@/components/ui';
import { useMoney } from '@/hooks/useMoney';
import { evenSplit, validateSplit, type SplitPart, type SplitProblem } from '@/lib/bank';
import { createId } from '@/lib/id';
import type { Category } from '@/types';

interface SplitEditorProps {
  totalCents: number;
  categories: readonly Category[];
  onFile: (parts: readonly SplitPart[]) => void;
  onCancel: () => void;
}

/** A part being edited. The key is only so React can tell two blank rows apart. */
interface DraftPart extends SplitPart {
  readonly key: string;
}

function evenParts(totalCents: number, previous: readonly DraftPart[] = []): DraftPart[] {
  const count = Math.max(2, previous.length);
  return evenSplit(totalCents, count).map((amountCents, index) => ({
    key: previous[index]?.key ?? createId(),
    categoryId: previous[index]?.categoryId ?? '',
    amountCents,
  }));
}

/**
 * Splitting one charge across categories — the weekly shop that was half
 * groceries and half a birthday present.
 *
 * It opens already split evenly in two, because that is what splitting almost
 * always means, so the common case is two taps and done. Editing one side of a
 * two-way split moves the other to match: there is only one place the rest of
 * the money can go, and making someone type it is making them do arithmetic the
 * app already knows the answer to.
 */
export default function SplitEditor({
  totalCents,
  categories,
  onFile,
  onCancel,
}: SplitEditorProps) {
  const { format } = useMoney();
  const [parts, setParts] = useState<DraftPart[]>(() => evenParts(totalCents));

  const problem = validateSplit(totalCents, parts);
  const canAddMore = parts.length < categories.length;

  const update = (key: string, changes: Partial<SplitPart>) => {
    setParts((current) => {
      const next = current.map((part) => (part.key === key ? { ...part, ...changes } : part));

      // Two parts have exactly one degree of freedom, so the other side follows.
      const edited = changes.amountCents;
      if (next.length !== 2 || edited === undefined) return next;

      return next.map((part) =>
        part.key === key ? part : { ...part, amountCents: Math.max(0, totalCents - edited) },
      );
    });
  };

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
            onChange={(event) => update(part.key, { categoryId: event.target.value })}
          />
          <div className="w-24 shrink-0">
            <MoneyInput
              valueCents={part.amountCents}
              onChange={(amountCents) => update(part.key, { amountCents })}
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
              onClick={() => setParts((current) => current.filter((p) => p.key !== part.key))}
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
          {canAddMore && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setParts((current) => [
                  ...current,
                  { key: createId(), categoryId: '', amountCents: 0 },
                ])
              }
            >
              <Icon name="add" />
              Category
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setParts((current) => evenParts(totalCents, current))}
          >
            Even
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={problem !== null}
          onClick={() =>
            onFile(
              parts.map(({ categoryId, amountCents }) => ({ categoryId, amountCents })),
            )
          }
        >
          <Icon name="approve" />
          File split
        </Button>
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
      return 'Two parts share a category — give it the whole amount instead.';
    case 'unassigned':
      return problem.differenceCents > 0
        ? `${format(problem.differenceCents)} still to assign.`
        : `${format(-problem.differenceCents)} more than the charge.`;
  }
}
