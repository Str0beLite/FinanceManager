/**
 * How a category claims its share of the paycheck.
 * - `fixed`   — an exact amount, taken off the top before percentages apply.
 * - `percent` — a share of whatever remains after all fixed categories.
 */
export type AllocationType = 'fixed' | 'percent';

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly allocationType: AllocationType;
  /** Cents when `allocationType` is 'fixed'. Ignored otherwise. */
  readonly fixedCents: number;
  /** Basis points (1% = 100) when `allocationType` is 'percent'. Ignored otherwise. */
  readonly percentBp: number;
  /**
   * A hard-set category always costs the same. It is never reduced to pay off a
   * rollover deficit — the cut is spread across the flexible categories instead.
   */
  readonly hardSet: boolean;
  /** Archived categories keep their history but drop out of new budgets. */
  readonly archived: boolean;
}

export type CategoryDraft = Omit<Category, 'id' | 'archived'>;
