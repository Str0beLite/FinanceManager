import { Badge, Button, Icon } from '@/components/ui';
import { useBankSync } from '@/hooks/useBank';
import { formatDayLabel } from '@/lib/dates';

/** The "when did this last work" line, plus the manual override. */
export default function SyncStatus() {
  const { status, error, summary, lastSyncedAt, hasConnections, sync } = useBankSync();
  const syncing = status === 'syncing';

  return (
    <div className="border-border-subtle mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <div className="min-w-0 text-xs">
        {error ? (
          <span className="text-danger" role="status">
            {error}
          </span>
        ) : (
          <span className="text-content-muted" role="status">
            {syncing
              ? 'Checking your bank…'
              : lastSyncedAt
                ? `Last checked ${formatDayLabel(lastSyncedAt.slice(0, 10))}`
                : 'Not checked yet.'}
            {summary && !syncing && (
              <>
                {' '}
                {summary.imported} filed, {summary.needsReview} to review
                {summary.skippedCredits > 0 && `, ${summary.skippedCredits} refunds ignored`}.
              </>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {syncing && <Badge tone="brand">Syncing</Badge>}
        <Button size="sm" onClick={() => void sync()} disabled={syncing || !hasConnections}>
          <Icon name="sync" className={syncing ? 'animate-spin' : undefined} />
          Sync now
        </Button>
      </div>
    </div>
  );
}
