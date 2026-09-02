/** A one-off expense charged to a category. */
export interface Transaction {
  readonly id: string;
  readonly categoryId: string;
  readonly amountCents: number;
  /** ISO date, `YYYY-MM-DD`. Its `YYYY-MM` prefix decides which month it lands in. */
  readonly date: string;
  readonly note: string;
  /**
   * The bank's own id, on transactions that arrived through bank syncing.
   *
   * Absent on anything typed in by hand, which is what makes it both the
   * dedupe key and the marker for "this came from a bank".
   */
  readonly externalId?: string;
  /**
   * One share of an expense that was split across categories.
   *
   * Each share is an ordinary expense from here on — edit it, delete it, and
   * the others are untouched. The mark exists so a bank charge that was split
   * is never rewritten from the bank again: the shares are somebody's judgement
   * about one purchase, and a new figure from the bank cannot be pushed into
   * them without overwriting it. Absent on everything else.
   */
  readonly split?: boolean;
  /**
   * Paid out of the rollover pool rather than out of this month's budget.
   *
   * It is still spending, and still belongs to its category — but the same
   * amount is added to that category's budget for the month, so the month's
   * "left to spend" does not move and the charge cannot also be handed to next
   * month as a deficit. The pool is what actually goes down, once, when the
   * expense is saved.
   */
  readonly fromPool?: boolean;
}

export type TransactionDraft = Omit<Transaction, 'id'>;
