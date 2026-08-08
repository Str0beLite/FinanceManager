export type Cadence = 'monthly' | 'quarterly' | 'annual';

export interface Subscription {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly amountCents: number;
  readonly cadence: Cadence;
  /**
   * First month this subscription bills, as `YYYY-MM`. For quarterly and annual
   * cadences it also sets the phase — a quarterly anchored to 2026-02 bills in
   * February, May, August and November.
   */
  readonly startMonth: string;
  /** Inclusive last billing month (`YYYY-MM`), or null if it runs forever. */
  readonly endMonth: string | null;
  /** Day of month the charge lands. Display only — the whole charge is budgeted upfront. */
  readonly billingDay: number;
  readonly active: boolean;
}

export type SubscriptionDraft = Omit<Subscription, 'id'>;
