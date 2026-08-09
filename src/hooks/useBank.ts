import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { classifyIncoming, shouldAutoSync, type SplitPart } from '@/lib/bank';
import { syncAll, type ConnectorConfig } from '@/lib/connector';
import { closedMonthKeys } from '@/lib/months';
import type { AppState } from '@/types';
import { useApp } from './useApp';

/**
 * One sync at a time, across every component that can start one.
 *
 * The Settings button and the automatic foreground sync are separate hook
 * instances, so the guard has to be module-level or the two could classify the
 * same batch against the same pre-dispatch state and import it twice.
 */
let syncInFlight = false;

export interface SyncSummary {
  readonly imported: number;
  readonly needsReview: number;
  readonly skippedCredits: number;
  readonly skippedOld: number;
  readonly splitChanged: number;
}

export type SyncStatus = 'idle' | 'syncing';

export function useBankConfig(): ConnectorConfig & { isConfigured: boolean } {
  const { state } = useApp();
  const { connectorUrl, connectorToken } = state.bank;

  return useMemo(
    () => ({
      url: connectorUrl,
      token: connectorToken,
      isConfigured: Boolean(connectorUrl && connectorToken),
    }),
    [connectorUrl, connectorToken],
  );
}

export function useBankSync() {
  const { state, dispatch } = useApp();
  const config = useBankConfig();

  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  // Sync reads the newest state between awaits, not the state captured when the
  // callback was built — otherwise a second connection would classify against a
  // ledger that is already one dispatch out of date.
  const latest = useRef<AppState>(state);
  latest.current = state;

  const connections = state.bank.connections;
  // The oldest of them, so one stale connection makes a sync due. A connection
  // that has never synced reports null, which counts as due immediately.
  const lastSyncedAt = useMemo(() => {
    let oldest: string | null = null;
    for (const connection of connections) {
      if (!connection.lastSyncedAt) return null;
      if (!oldest || connection.lastSyncedAt < oldest) oldest = connection.lastSyncedAt;
    }
    return oldest;
  }, [connections]);

  const sync = useCallback(async () => {
    if (!config.isConfigured || syncInFlight) return;
    if (latest.current.bank.connections.length === 0) return;

    syncInFlight = true;
    setStatus('syncing');
    setError(null);

    const totals = {
      imported: 0,
      needsReview: 0,
      skippedCredits: 0,
      skippedOld: 0,
      splitChanged: 0,
    };

    try {
      for (const connection of latest.current.bank.connections) {
        const result = await syncAll(config, connection.id, connection.cursor);
        if (!result.ok) {
          setError(result.error);
          continue;
        }

        const current = latest.current;
        const plan = classifyIncoming({
          incoming: result.data.incoming,
          connectionId: connection.id,
          rules: current.bank.rules,
          transactions: current.transactions,
          inbox: current.bank.inbox,
          closedMonths: closedMonthKeys(current),
          importFrom: connection.importFrom,
        });

        totals.imported += plan.added.length;
        totals.needsReview += plan.inboxAdded.length;
        totals.skippedCredits += plan.skippedCredits;
        totals.skippedOld += plan.skippedOld;
        totals.splitChanged += plan.splitChanged;

        dispatch({
          type: 'bank/synced',
          connectionId: connection.id,
          plan,
          removedExternalIds: result.data.removed,
          cursor: result.data.nextCursor,
          syncedAt: new Date().toISOString(),
        });
      }

      setSummary(totals);
    } finally {
      syncInFlight = false;
      setStatus('idle');
    }
  }, [config, dispatch]);

  return {
    isConfigured: config.isConfigured,
    hasConnections: connections.length > 0,
    status,
    error,
    summary,
    lastSyncedAt,
    sync,
  };
}

/**
 * Syncs when the app comes to the front, throttled.
 *
 * A static site can't receive Plaid's webhooks, so this is what "as they roll
 * in" amounts to in practice: whatever cleared since last time is already
 * counted by the time the dashboard is on screen. Mounted once, in `App`.
 */
export function useBankAutoSync(): void {
  const { sync, isConfigured, hasConnections, lastSyncedAt } = useBankSync();

  useEffect(() => {
    if (!isConfigured || !hasConnections) return;

    const check = () => {
      if (document.visibilityState !== 'visible') return;
      if (!shouldAutoSync(lastSyncedAt, Date.now())) return;
      void sync();
    };

    // Re-runs when `lastSyncedAt` moves, but the throttle is false the moment
    // after a sync, so this settles rather than looping.
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, [isConfigured, hasConnections, lastSyncedAt, sync]);
}

export function useInbox() {
  const { state, dispatch } = useApp();
  const { inbox } = state.bank;

  const approve = useCallback(
    (importId: string, categoryId: string, ruleMatch?: string) =>
      dispatch({ type: 'bank/approve', importId, categoryId, ruleMatch }),
    [dispatch],
  );

  const split = useCallback(
    (importId: string, parts: readonly SplitPart[]) =>
      dispatch({ type: 'bank/split', importId, parts }),
    [dispatch],
  );

  const dismiss = useCallback(
    (importId: string) => dispatch({ type: 'bank/dismiss', importId }),
    [dispatch],
  );

  // Newest first: the charge you're trying to remember is the one from today.
  const rows = useMemo(
    () => [...inbox].sort((a, b) => b.date.localeCompare(a.date)),
    [inbox],
  );

  return { rows, approve, split, dismiss };
}
