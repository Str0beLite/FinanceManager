import type { AllocationType } from './category';

/** One category's slice of a computed month. Everything the UI needs, precomputed. */
export interface CategoryComputation {
  readonly categoryId: string;
  readonly name: string;
  readonly color: string;
  readonly hardSet: boolean;
  readonly allocationType: AllocationType;
  /** Budget before any rollover deficit is applied. */
  readonly baseCents: number;
  /** How much of the deficit this category absorbed. Always 0 when hard set. */
  readonly cutCents: number;
  /**
   * Spending here that was paid out of the rollover pool, which is added to
   * `budgetCents` so the month's own money is untouched by it.
   */
  readonly pooledCents: number;
  /** `max(0, baseCents - cutCents) + pooledCents`. */
  readonly budgetCents: number;
  readonly subscriptionCents: number;
  readonly transactionCents: number;
  readonly spentCents: number;
  /** `budgetCents - spentCents`. Negative means this category is over. */
  readonly remainingCents: number;
  /** spent / budget, clamped at 0 when there is no budget. */
  readonly usageRatio: number;
}

/** The complete financial picture of one month. Produced by `computeMonth`. */
export interface MonthComputation {
  readonly monthKey: string;
  readonly paycheckCents: number;
  readonly extraIncomeCents: number;
  readonly incomeCents: number;
  /** Total claimed by fixed-amount categories, taken off the top. */
  readonly fixedTotalCents: number;
  /** What is left for percentage categories to split. */
  readonly percentPoolCents: number;
  /** True when fixed categories alone cost more than the month's income. */
  readonly overcommitted: boolean;
  /** Deficit carried in from last month (positive = money to claw back). */
  readonly deficitInCents: number;
  /** How much of that deficit the flexible categories could absorb. */
  readonly deficitAppliedCents: number;
  /** The rest, which rolls on to the next month rather than disappearing. */
  readonly unabsorbedDeficitCents: number;
  readonly categories: readonly CategoryComputation[];
  readonly totalBudgetCents: number;
  readonly totalSpentCents: number;
  /**
   * How much of this month's spending came out of the pool. Counted into both
   * the budget and the spend, so it cancels out of `totalRemainingCents` and
   * the month settles as if it had never happened.
   */
  readonly totalPooledCents: number;
  /** `totalBudget - totalSpent`. Positive is savings, negative is overspend. */
  readonly totalRemainingCents: number;
}

/** What closing a month does to the pool and to next month. */
export interface Settlement {
  readonly monthKey: string;
  readonly deltaCents: number;
  /** Added to the rollover pool. Zero on an overspent month. */
  readonly poolChangeCents: number;
  /** Deficit handed to the following month. */
  readonly nextDeficitCents: number;
}

export interface MonthRecord {
  /** `YYYY-MM`. */
  readonly key: string;
  /** Per-month override; falls back to the default paycheck in settings. */
  readonly paycheckCents: number | null;
  /** Deficit inherited from the previous month's close, less any pool applied to it. */
  readonly deficitInCents: number;
  /**
   * Rollover pool manually spent against this month's deficit. Tracked so that
   * reopening the previous month can refund it instead of losing the money.
   */
  readonly poolAppliedCents: number;
  readonly closed: boolean;
  /**
   * Frozen at close so editing categories later never rewrites history.
   * Null while the month is still open.
   */
  readonly snapshot: {
    readonly computation: MonthComputation;
    readonly settlement: Settlement;
  } | null;
}
