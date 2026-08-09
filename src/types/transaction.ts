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
}

export type TransactionDraft = Omit<Transaction, 'id'>;
