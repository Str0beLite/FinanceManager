import {
  applyRemovals,
  normalizeMerchant,
  validateSplit,
  type IngestPlan,
  type SplitPart,
} from '@/lib/bank';
import { monthKeyOf } from '@/lib/dates';
import { createId } from '@/lib/id';
import { settlePool } from '@/lib/pool';
import type { AppState, BankRule, PendingImport, Transaction } from '@/types';

export type BankAction =
  | { type: 'bank/configure'; connectorUrl: string; connectorToken: string }
  | { type: 'bank/connect'; itemId: string; institutionName: string }
  | { type: 'bank/disconnect'; id: string }
  | {
      type: 'bank/synced';
      connectionId: string;
      plan: IngestPlan;
      removedExternalIds: readonly string[];
      cursor: string;
      syncedAt: string;
    }
  | {
      type: 'bank/approve';
      importId: string;
      categoryId: string;
      /** When set, a rule is created so the next charge like this files itself. */
      ruleMatch?: string;
      /** Paid out of savings rather than out of the month's budget. */
      fromPool?: boolean;
    }
  | {
      type: 'bank/split';
      importId: string;
      /** Must add up to the charge exactly; the reducer refuses anything else. */
      parts: readonly SplitPart[];
    }
  | { type: 'bank/dismiss'; importId: string }
  | { type: 'bank/addRule'; match: string; categoryId: string }
  | { type: 'bank/deleteRule'; id: string };

export function bankReducer(state: AppState, action: BankAction): AppState {
  switch (action.type) {
    case 'bank/configure':
      return withBank(state, {
        connectorUrl: action.connectorUrl.trim().replace(/\/+$/, ''),
        connectorToken: action.connectorToken.trim(),
      });

    case 'bank/connect':
      return withBank(state, {
        connections: [
          ...state.bank.connections.filter((connection) => connection.id !== action.itemId),
          {
            id: action.itemId,
            institutionName: action.institutionName,
            connectedAt: new Date().toISOString(),
            // The month you connected in, from its first day: enough to complete
            // the month you are living in, without reaching into closed books.
            importFrom: `${monthKeyOf()}-01`,
            cursor: null,
            lastSyncedAt: null,
          },
        ],
      });

    case 'bank/disconnect':
      // Transactions already imported are the user's own records now, so they
      // stay. Only the link and anything still unreviewed go.
      return withBank(state, {
        connections: state.bank.connections.filter((connection) => connection.id !== action.id),
        inbox: state.bank.inbox.filter((row) => row.connectionId !== action.id),
      });

    case 'bank/synced':
      return applySync(state, action);

    case 'bank/approve':
      return approve(state, action);

    case 'bank/split':
      return split(state, action);

    case 'bank/dismiss':
      return withBank(state, {
        inbox: state.bank.inbox.filter((row) => row.id !== action.importId),
      });

    case 'bank/addRule':
      return withBank(state, { rules: addRule(state.bank.rules, action.match, action.categoryId) });

    case 'bank/deleteRule':
      return withBank(state, {
        rules: state.bank.rules.filter((rule) => rule.id !== action.id),
      });

    default:
      return state;
  }
}

/**
 * One sync, applied as a single state change.
 *
 * Everything a sync decides was worked out by `classifyIncoming` before this
 * ran, so this is pure bookkeeping: retract, amend, append, move the cursor.
 */
function applySync(
  state: AppState,
  action: Extract<BankAction, { type: 'bank/synced' }>,
): AppState {
  const { plan } = action;

  const pruned = applyRemovals(action.removedExternalIds, state.transactions, state.bank.inbox);

  const updates = new Map(plan.updated.map((update) => [update.id, update.changes]));
  const amended = pruned.transactions.map((transaction) => {
    const changes = updates.get(transaction.id);
    return changes ? { ...transaction, ...changes } : transaction;
  });

  const added: Transaction[] = plan.added.map((draft) => ({ ...draft, id: createId() }));

  const inboxUpdates = new Map(plan.inboxUpdated.map((update) => [update.id, update.changes]));
  const amendedInbox = pruned.inbox.map((row) => {
    const changes = inboxUpdates.get(row.id);
    return changes ? { ...row, ...changes } : row;
  });

  const newInbox: PendingImport[] = plan.inboxAdded.map((draft) => ({
    ...draft,
    id: createId(),
  }));

  const transactions = [...amended, ...added];

  return {
    ...state,
    transactions,
    // The bank can shrink a pool-funded charge or retract it outright, and
    // either way the money has to find its way back to savings.
    rolloverPoolCents: settlePool(state.rolloverPoolCents, state.transactions, transactions),
    bank: {
      ...state.bank,
      inbox: [...amendedInbox, ...newInbox],
      connections: state.bank.connections.map((connection) =>
        connection.id === action.connectionId
          ? { ...connection, cursor: action.cursor, lastSyncedAt: action.syncedAt }
          : connection,
      ),
    },
  };
}

/** Files one reviewed charge, and optionally teaches the app to do it next time. */
function approve(
  state: AppState,
  action: Extract<BankAction, { type: 'bank/approve' }>,
): AppState {
  const row = state.bank.inbox.find((entry) => entry.id === action.importId);
  if (!row) return state;

  const transaction: Transaction = {
    id: createId(),
    categoryId: action.categoryId,
    amountCents: row.amountCents,
    date: row.date,
    note: row.merchant,
    externalId: row.externalId,
    ...(action.fromPool ? { fromPool: true } : {}),
  };

  const transactions = [...state.transactions, transaction];

  return {
    ...state,
    transactions,
    rolloverPoolCents: settlePool(state.rolloverPoolCents, state.transactions, transactions),
    bank: {
      ...state.bank,
      inbox: state.bank.inbox.filter((entry) => entry.id !== action.importId),
      // A rule remembers a category and nothing else. Paying out of savings is
      // a judgement about one charge, the same way a split is, so it is never
      // learned from — the next charge from this merchant files normally.
      rules: action.ruleMatch
        ? addRule(state.bank.rules, action.ruleMatch, action.categoryId)
        : state.bank.rules,
    },
  };
}

/**
 * Files one reviewed charge across several categories at once.
 *
 * Every part carries the same `externalId`, which is what keeps the split
 * whole for the rest of its life: a later sync sees one charge, an amendment
 * is shared out across the parts, and a retraction takes all of them.
 *
 * No rule is offered here. A rule files a merchant to one category, and there
 * is no honest way to guess that this particular Costco run was two thirds
 * groceries — a split is a judgement about one purchase, not about a merchant.
 */
function split(state: AppState, action: Extract<BankAction, { type: 'bank/split' }>): AppState {
  const row = state.bank.inbox.find((entry) => entry.id === action.importId);
  if (!row) return state;

  // Checked here as well as in the form, because the reducer is what the saved
  // file is built from: a split that does not add up would be a month that is
  // quietly wrong, and there would be nothing left to notice it by.
  if (validateSplit(row.amountCents, action.parts)) return state;

  const transactions: Transaction[] = action.parts.map((part) => ({
    id: createId(),
    categoryId: part.categoryId,
    amountCents: part.amountCents,
    date: row.date,
    note: row.merchant,
    externalId: row.externalId,
    split: true,
  }));

  return {
    ...state,
    transactions: [...state.transactions, ...transactions],
    bank: {
      ...state.bank,
      inbox: state.bank.inbox.filter((entry) => entry.id !== action.importId),
    },
  };
}

/** Rules are keyed by their normalised text, so saying the same thing twice re-points it. */
function addRule(
  rules: readonly BankRule[],
  match: string,
  categoryId: string,
): readonly BankRule[] {
  const normalized = normalizeMerchant(match);
  if (!normalized) return rules;

  const existing = rules.find((rule) => normalizeMerchant(rule.match) === normalized);
  if (existing) {
    return rules.map((rule) =>
      rule.id === existing.id ? { ...rule, categoryId } : rule,
    );
  }

  return [...rules, { id: createId(), match: normalized, categoryId }];
}

function withBank(state: AppState, changes: Partial<AppState['bank']>): AppState {
  return { ...state, bank: { ...state.bank, ...changes } };
}
