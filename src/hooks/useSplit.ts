import { useCallback, useEffect, useState } from 'react';
import { evenSplit, validateSplit, type SplitPart, type SplitProblem } from '@/lib/bank';
import { createId } from '@/lib/id';

/** A part being edited. The key is only so React can tell two blank rows apart. */
export interface DraftPart extends SplitPart {
  readonly key: string;
}

export interface SplitController {
  readonly parts: readonly DraftPart[];
  /** Why it can't be filed yet, or `null`. */
  readonly problem: SplitProblem | null;
  readonly setPart: (key: string, changes: Partial<SplitPart>) => void;
  readonly addPart: () => void;
  readonly removePart: (key: string) => void;
  readonly even: () => void;
  /** What the store wants: the parts with the editing scaffolding taken off. */
  readonly toParts: () => readonly SplitPart[];
}

function reslice(totalCents: number, previous: readonly DraftPart[] = []): DraftPart[] {
  const count = Math.max(2, previous.length);
  return evenSplit(totalCents, count).map((amountCents, index) => ({
    key: previous[index]?.key ?? createId(),
    categoryId: previous[index]?.categoryId ?? '',
    amountCents,
  }));
}

/**
 * The state behind splitting one expense across categories.
 *
 * Shared by the two places a split can start — a charge in the review inbox,
 * and an expense being typed in by hand — so both behave identically and the
 * editor itself stays presentational.
 *
 * It starts already halved, because that is what splitting almost always means:
 * the common case is picking two categories and filing.
 */
export function useSplit(totalCents: number): SplitController {
  const [parts, setParts] = useState<DraftPart[]>(() => reslice(totalCents));

  // The amount can move underneath a split being typed in by hand. Re-even the
  // shares rather than leaving them adding up to a number that no longer
  // exists; the categories already chosen are kept.
  useEffect(() => {
    setParts((current) => reslice(totalCents, current));
  }, [totalCents]);

  const setPart = useCallback(
    (key: string, changes: Partial<SplitPart>) => {
      setParts((current) => {
        const next = current.map((part) =>
          part.key === key ? { ...part, ...changes } : part,
        );

        // Two parts have exactly one degree of freedom, so the other follows.
        // Making someone type it would be making them do arithmetic this
        // already knows the answer to.
        const edited = changes.amountCents;
        if (next.length !== 2 || edited === undefined) return next;

        return next.map((part) =>
          part.key === key ? part : { ...part, amountCents: Math.max(0, totalCents - edited) },
        );
      });
    },
    [totalCents],
  );

  const addPart = useCallback(() => {
    setParts((current) => {
      // The new share comes out of the biggest part rather than starting at
      // zero. Adding a category then never leaves a blank to fill in, and never
      // quietly re-evens shares that were set on purpose.
      const share = Math.floor(totalCents / (current.length + 1));
      const biggest = current.reduce(
        (best, part, index) => (part.amountCents > current[best].amountCents ? index : best),
        0,
      );

      return [
        ...current.map((part, index) =>
          index === biggest
            ? { ...part, amountCents: Math.max(0, part.amountCents - share) }
            : part,
        ),
        { key: createId(), categoryId: '', amountCents: share },
      ];
    });
  }, [totalCents]);

  const removePart = useCallback((key: string) => {
    setParts((current) => current.filter((part) => part.key !== key));
  }, []);

  const even = useCallback(() => {
    setParts((current) => reslice(totalCents, current));
  }, [totalCents]);

  const toParts = useCallback(
    () => parts.map(({ categoryId, amountCents }) => ({ categoryId, amountCents })),
    [parts],
  );

  return {
    parts,
    problem: validateSplit(totalCents, parts),
    setPart,
    addPart,
    removePart,
    even,
    toParts,
  };
}
