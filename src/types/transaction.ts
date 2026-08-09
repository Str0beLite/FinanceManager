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
}

export type TransactionDraft = Omit<Transaction, 'id'>;
