import { BASIS_POINTS_TOTAL } from '@/config/constants';
import type { Category } from '@/types';
import { sumBy } from './money';

export interface AllocationStatus {
  readonly percentTotalBp: number;
  readonly remainderBp: number;
  readonly isBalanced: boolean;
  /** True when no percentage categories exist at all — an empty split, not an error. */
  readonly isEmpty: boolean;
}

/**
 * Percentage categories must add up to exactly 100%. Anything else means part
 * of the paycheck is unassigned (or double-assigned), so the UI nudges about it.
 */
export function checkAllocation(categories: readonly Category[]): AllocationStatus {
  const percentCategories = categories.filter(
    (c) => !c.archived && c.allocationType === 'percent',
  );
  const percentTotalBp = sumBy(percentCategories, (c) => c.percentBp);

  return {
    percentTotalBp,
    remainderBp: BASIS_POINTS_TOTAL - percentTotalBp,
    isBalanced: percentCategories.length === 0 || percentTotalBp === BASIS_POINTS_TOTAL,
    isEmpty: percentCategories.length === 0,
  };
}

export function percentFromBp(bp: number): number {
  return bp / 100;
}

export function bpFromPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.round(percent * 100);
}

export function formatPercentBp(bp: number): string {
  const percent = percentFromBp(bp);
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}

export interface FieldErrors {
  [field: string]: string | undefined;
}

export function validateCategoryName(
  name: string,
  existing: readonly Category[],
  currentId?: string,
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return 'Give the category a name.';
  const clash = existing.some(
    (c) => c.id !== currentId && c.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  return clash ? 'A category with that name already exists.' : undefined;
}

export function validatePositiveAmount(cents: number): string | undefined {
  if (cents <= 0) return 'Enter an amount greater than zero.';
  return undefined;
}
