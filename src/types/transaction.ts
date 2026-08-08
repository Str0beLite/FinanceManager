/** A one-off expense charged to a category. */
export interface Transaction {
  readonly id: string;
  readonly categoryId: string;
  readonly amountCents: number;
  /** ISO date, `YYYY-MM-DD`. Its `YYYY-MM` prefix decides which month it lands in. */
  readonly date: string;
  readonly note: string;
}

export type TransactionDraft = Omit<Transaction, 'id'>;
