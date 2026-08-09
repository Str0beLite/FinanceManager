import { describe, expect, it } from 'vitest';
import {
  AUTO_SYNC_INTERVAL_MS,
  applyRemovals,
  classifyIncoming,
  evenSplit,
  matchRule,
  normalizeMerchant,
  rescale,
  shouldAutoSync,
  validateSplit,
  type ClassifyInput,
} from '@/lib/bank';
import type { BankRule, IncomingTransaction, PendingImport, Transaction } from '@/types';
import { transaction } from './helpers';

function incoming(overrides: Partial<IncomingTransaction> = {}): IncomingTransaction {
  return {
    externalId: 'plaid-1',
    pendingExternalId: null,
    merchant: 'Blue Bottle Coffee',
    amount: 4.75,
    date: '2026-08-12',
    pending: false,
    ...overrides,
  };
}

function rule(match: string, categoryId: string): BankRule {
  return { id: `rule-${match}`, match, categoryId };
}

function pending(overrides: Partial<PendingImport> = {}): PendingImport {
  return {
    id: 'inbox-1',
    externalId: 'plaid-1',
    connectionId: 'item-1',
    merchant: 'Blue Bottle Coffee',
    amountCents: 475,
    date: '2026-08-12',
    pending: true,
    reason: 'unmatched',
    ...overrides,
  };
}

function classify(overrides: Partial<ClassifyInput> = {}) {
  return classifyIncoming({
    incoming: [],
    connectionId: 'item-1',
    rules: [],
    transactions: [],
    inbox: [],
    closedMonths: new Set(),
    // No cutoff unless a test is about the cutoff, so every other case still
    // asks what it was written to ask.
    importFrom: '',
    ...overrides,
  });
}

describe('toCents via classifyIncoming', () => {
  it('converts major units without losing a cent to float drift', () => {
    const plan = classify({
      incoming: [
        incoming({ externalId: 'a', amount: 12.34 }),
        incoming({ externalId: 'b', amount: 0.29 }),
        incoming({ externalId: 'c', amount: 1050.07 }),
      ],
      rules: [rule('blue bottle', 'cat-1')],
    });

    expect(plan.added.map((t) => t.amountCents)).toEqual([1234, 29, 105_007]);
  });
});

describe('normalizeMerchant', () => {
  it('flattens case and whitespace so rules match what people type', () => {
    expect(normalizeMerchant('  BLUE   Bottle\tCoffee ')).toBe('blue bottle coffee');
  });
});

describe('matchRule', () => {
  const rules = [rule('amazon', 'cat-shopping'), rule('amazon fresh', 'cat-groceries')];

  it('picks the longest match, whatever order the rules are in', () => {
    expect(matchRule(rules, 'AMAZON FRESH #221')?.categoryId).toBe('cat-groceries');
    expect(matchRule([...rules].reverse(), 'AMAZON FRESH #221')?.categoryId).toBe(
      'cat-groceries',
    );
  });

  it('falls back to the general rule when the specific one misses', () => {
    expect(matchRule(rules, 'Amazon Marketplace')?.categoryId).toBe('cat-shopping');
  });

  it('returns null when nothing matches, and ignores an empty rule', () => {
    expect(matchRule(rules, 'Corner Store')).toBeNull();
    expect(matchRule([rule('  ', 'cat-1')], 'anything')).toBeNull();
  });
});

describe('classifyIncoming', () => {
  it('files a charge that matches a rule and inboxes one that does not', () => {
    const plan = classify({
      incoming: [
        incoming({ externalId: 'a', merchant: 'Blue Bottle Coffee' }),
        incoming({ externalId: 'b', merchant: 'Mystery Vendor', amount: 20 }),
      ],
      rules: [rule('blue bottle', 'cat-coffee')],
    });

    expect(plan.added).toEqual([
      {
        categoryId: 'cat-coffee',
        amountCents: 475,
        date: '2026-08-12',
        note: 'Blue Bottle Coffee',
        externalId: 'a',
      },
    ]);
    expect(plan.inboxAdded).toHaveLength(1);
    expect(plan.inboxAdded[0]).toMatchObject({
      externalId: 'b',
      merchant: 'Mystery Vendor',
      amountCents: 2000,
      reason: 'unmatched',
    });
  });

  it('ignores credits rather than counting a refund as spending', () => {
    const plan = classify({
      incoming: [incoming({ externalId: 'a', amount: -30 }), incoming({ externalId: 'b', amount: 0 })],
      rules: [rule('blue bottle', 'cat-coffee')],
    });

    expect(plan.added).toEqual([]);
    expect(plan.inboxAdded).toEqual([]);
    expect(plan.skippedCredits).toBe(2);
  });

  it('skips a charge it has already imported', () => {
    const existing: Transaction = {
      ...transaction('cat-coffee', 4.75, '2026-08-12'),
      externalId: 'a',
    };

    const plan = classify({
      incoming: [incoming({ externalId: 'a' })],
      transactions: [existing],
      rules: [rule('blue bottle', 'cat-coffee')],
    });

    expect(plan.added).toEqual([]);
    expect(plan.updated).toEqual([]);
    expect(plan.duplicates).toBe(1);
  });

  it('skips a charge already sitting in the inbox', () => {
    const plan = classify({
      incoming: [incoming({ externalId: 'plaid-1' })],
      inbox: [pending()],
    });

    expect(plan.inboxAdded).toEqual([]);
    expect(plan.duplicates).toBe(1);
  });

  it('updates a posted charge in place instead of duplicating the pending one', () => {
    // The tip landed after the card was swiped, so the amount moved and the
    // bank issued a new id. The category the user chose must survive.
    const existing: Transaction = {
      ...transaction('cat-coffee', 4.75, '2026-08-12'),
      externalId: 'pending-1',
    };

    const plan = classify({
      incoming: [
        incoming({ externalId: 'posted-1', pendingExternalId: 'pending-1', amount: 5.75 }),
      ],
      transactions: [existing],
    });

    expect(plan.added).toEqual([]);
    expect(plan.updated).toEqual([
      { id: existing.id, changes: { amountCents: 575, date: '2026-08-12', externalId: 'posted-1' } },
    ]);
  });

  it('promotes a pending inbox row rather than adding a second one', () => {
    const plan = classify({
      incoming: [
        incoming({ externalId: 'posted-1', pendingExternalId: 'plaid-1', amount: 5.75 }),
      ],
      inbox: [pending()],
    });

    expect(plan.inboxAdded).toEqual([]);
    expect(plan.inboxUpdated).toEqual([
      {
        id: 'inbox-1',
        changes: {
          amountCents: 575,
          date: '2026-08-12',
          externalId: 'posted-1',
          pending: false,
        },
      },
    ]);
  });

  it('keeps only the posted version when one batch carries both', () => {
    const plan = classify({
      incoming: [
        incoming({ externalId: 'pending-1', amount: 4.75, pending: true }),
        incoming({ externalId: 'posted-1', pendingExternalId: 'pending-1', amount: 5.75 }),
      ],
      rules: [rule('blue bottle', 'cat-coffee')],
    });

    expect(plan.added).toEqual([
      {
        categoryId: 'cat-coffee',
        amountCents: 575,
        date: '2026-08-12',
        note: 'Blue Bottle Coffee',
        externalId: 'posted-1',
      },
    ]);
    expect(plan.duplicates).toBe(1);
  });

  it('holds a charge dated in a closed month, even when a rule matches it', () => {
    // Closed months render from a frozen snapshot, so writing into one would
    // count for nothing and show up nowhere.
    const plan = classify({
      incoming: [incoming({ externalId: 'a', date: '2026-07-30' })],
      rules: [rule('blue bottle', 'cat-coffee')],
      closedMonths: new Set(['2026-07']),
    });

    expect(plan.added).toEqual([]);
    expect(plan.inboxAdded[0]).toMatchObject({ reason: 'closed-month', date: '2026-07-30' });
  });

  it('gives a nameless charge something to show in the inbox', () => {
    const plan = classify({ incoming: [incoming({ externalId: 'a', merchant: '   ' })] });
    expect(plan.inboxAdded[0].merchant).toBe('Unknown merchant');
  });
});

describe('applyRemovals', () => {
  it('drops a retracted charge from both the ledger and the inbox', () => {
    const banked: Transaction = {
      ...transaction('cat-coffee', 4.75, '2026-08-12'),
      externalId: 'gone',
    };
    const typed = transaction('cat-coffee', 10, '2026-08-13');

    const result = applyRemovals(['gone', 'also-gone'], [banked, typed], [
      pending({ externalId: 'also-gone' }),
      pending({ id: 'inbox-2', externalId: 'stays' }),
    ]);

    expect(result.transactions).toEqual([typed]);
    expect(result.inbox.map((row) => row.externalId)).toEqual(['stays']);
  });

  it('leaves everything alone when nothing was removed', () => {
    const transactions = [transaction('cat-1', 5, '2026-08-01')];
    const result = applyRemovals([], transactions, []);
    expect(result.transactions).toBe(transactions);
  });
});

describe('shouldAutoSync', () => {
  const now = Date.parse('2026-08-12T12:00:00Z');

  it('syncs when it has never synced', () => {
    expect(shouldAutoSync(null, now)).toBe(true);
    expect(shouldAutoSync('not a date', now)).toBe(true);
  });

  it('holds off inside the throttle window', () => {
    const recent = new Date(now - AUTO_SYNC_INTERVAL_MS + 1000).toISOString();
    expect(shouldAutoSync(recent, now)).toBe(false);
  });

  it('syncs again once the window has passed', () => {
    const stale = new Date(now - AUTO_SYNC_INTERVAL_MS).toISOString();
    expect(shouldAutoSync(stale, now)).toBe(true);
  });
});

describe('history from before the connection', () => {
  it('is dropped rather than imported', () => {
    const plan = classify({
      importFrom: '2026-08-01',
      incoming: [
        incoming({ externalId: 'old-1', date: '2026-07-31' }),
        incoming({ externalId: 'new-1', date: '2026-08-01' }),
      ],
      rules: [rule('blue bottle', 'cat-coffee')],
    });

    expect(plan.skippedOld).toBe(1);
    expect(plan.added).toHaveLength(1);
    expect(plan.added[0]?.externalId).toBe('new-1');
  });

  it('does not queue for review either — the point is to not deal with it at all', () => {
    const plan = classify({
      importFrom: '2026-08-01',
      incoming: [incoming({ date: '2026-05-04' })],
    });

    expect(plan.inboxAdded).toHaveLength(0);
    expect(plan.added).toHaveLength(0);
    expect(plan.skippedOld).toBe(1);
  });

  it('takes the first of the month itself, which is the month you connected in', () => {
    const plan = classify({
      importFrom: '2026-08-01',
      incoming: [incoming({ date: '2026-08-01' })],
    });

    expect(plan.skippedOld).toBe(0);
    expect(plan.inboxAdded).toHaveLength(1);
  });

  it('counts an old charge as old, not as a refund', () => {
    const plan = classify({
      importFrom: '2026-08-01',
      incoming: [incoming({ date: '2026-06-02', amount: -20 })],
    });

    expect(plan.skippedOld).toBe(1);
    expect(plan.skippedCredits).toBe(0);
  });

  it('imports everything when no cutoff is set', () => {
    const plan = classify({
      importFrom: '',
      incoming: [incoming({ date: '2020-01-01' })],
    });

    expect(plan.skippedOld).toBe(0);
    expect(plan.inboxAdded).toHaveLength(1);
  });
});

describe('evenSplit', () => {
  it('divides cleanly when it can', () => {
    expect(evenSplit(1000, 2)).toEqual([500, 500]);
    expect(evenSplit(900, 3)).toEqual([300, 300, 300]);
  });

  it('gives the odd cents away rather than losing them', () => {
    expect(evenSplit(475, 2)).toEqual([238, 237]);
    expect(evenSplit(1000, 3)).toEqual([334, 333, 333]);
  });

  it('always adds back to the charge, whatever the shape', () => {
    for (const total of [1, 7, 99, 1234, 100_003]) {
      for (const count of [2, 3, 4, 7]) {
        const parts = evenSplit(total, count);
        expect(parts).toHaveLength(count);
        expect(parts.reduce((sum, part) => sum + part, 0)).toBe(total);
      }
    }
  });
});

describe('rescale', () => {
  it('keeps the proportions of a split when the amount moves', () => {
    expect(rescale([750, 250], 2000)).toEqual([1500, 500]);
  });

  it('lands on the new total exactly, however the cents fall', () => {
    const parts = rescale([333, 333, 334], 1001);
    expect(parts.reduce((sum, part) => sum + part, 0)).toBe(1001);
  });

  it('hands the whole amount over when there is only one part', () => {
    expect(rescale([475], 575)).toEqual([575]);
  });

  it('falls back to an even split when there is no shape to keep', () => {
    expect(rescale([0, 0], 501)).toEqual([251, 250]);
  });
});

describe('validateSplit', () => {
  const part = (categoryId: string, amountCents: number) => ({ categoryId, amountCents });

  it('passes a split that adds up', () => {
    expect(validateSplit(1000, [part('a', 600), part('b', 400)])).toBeNull();
  });

  it('refuses a split that is short, and says by how much', () => {
    expect(validateSplit(1000, [part('a', 600), part('b', 300)])).toEqual({
      kind: 'unassigned',
      differenceCents: 100,
    });
  });

  it('refuses one that overshoots, which is the same rule from the other side', () => {
    expect(validateSplit(1000, [part('a', 600), part('b', 600)])).toEqual({
      kind: 'unassigned',
      differenceCents: -200,
    });
  });

  it('refuses the degenerate cases', () => {
    expect(validateSplit(1000, [part('a', 1000)])).toEqual({ kind: 'too-few' });
    expect(validateSplit(1000, [part('', 500), part('b', 500)])).toEqual({
      kind: 'missing-category',
    });
    expect(validateSplit(1000, [part('a', 1000), part('b', 0)])).toEqual({
      kind: 'non-positive',
    });
    expect(validateSplit(1000, [part('a', 500), part('a', 500)])).toEqual({
      kind: 'duplicate-category',
    });
  });
});

describe('a charge that was split across categories', () => {
  function splitCharge(externalId: string, ...amounts: number[]): Transaction[] {
    return amounts.map((amount, index) => ({
      ...transaction(`cat-${index}`, amount / 100, '2026-08-12'),
      id: `row-${index}`,
      externalId,
    }));
  }

  it('is recognised by its total, so a re-sync does not import it again', () => {
    const plan = classify({
      incoming: [incoming({ externalId: 'a', amount: 10 })],
      transactions: splitCharge('a', 600, 400),
    });

    expect(plan.duplicates).toBe(1);
    expect(plan.added).toEqual([]);
    expect(plan.updated).toEqual([]);
  });

  it('shares an amendment out instead of writing it to one part', () => {
    // The tip landed after the card was swiped: $10.00 became $12.00, and each
    // category should carry its share of the extra rather than one carrying all.
    const plan = classify({
      incoming: [incoming({ externalId: 'a', amount: 12 })],
      transactions: splitCharge('a', 750, 250),
    });

    expect(plan.updated).toEqual([
      { id: 'row-0', changes: { amountCents: 900, date: '2026-08-12', externalId: 'a' } },
      { id: 'row-1', changes: { amountCents: 300, date: '2026-08-12', externalId: 'a' } },
    ]);
  });

  it('is retracted whole when the bank takes the charge back', () => {
    const result = applyRemovals(['a'], splitCharge('a', 600, 400), []);
    expect(result.transactions).toEqual([]);
  });
});
