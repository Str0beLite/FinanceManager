/**
 * Money arriving on top of the monthly paycheck — a bonus, refund or side gig.
 * It has no category: it raises the month's income, which then flows through
 * the normal fixed-then-percentage split.
 */
export interface IncomeEntry {
  readonly id: string;
  readonly label: string;
  readonly amountCents: number;
  /** ISO date, `YYYY-MM-DD`. Its `YYYY-MM` prefix decides which month it lands in. */
  readonly date: string;
}

export type IncomeDraft = Omit<IncomeEntry, 'id'>;
