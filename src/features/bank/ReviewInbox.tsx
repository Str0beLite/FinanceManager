import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Icon,
  Select,
  Toggle,
  inputClasses,
} from '@/components/ui';
import { useBankConfig, useInbox } from '@/hooks/useBank';
import { useActiveCategories } from '@/hooks/useCategories';
import { useMoney } from '@/hooks/useMoney';
import { useSplit } from '@/hooks/useSplit';
import { normalizeMerchant, type SplitPart } from '@/lib/bank';
import { formatDayLabel, formatMonthLabel, monthKeyOfIsoDate } from '@/lib/dates';
import type { Category, PendingImport } from '@/types';
// Reached by path rather than through the feature's barrel: the expenses page
// imports this inbox, so going back through that barrel would be a cycle.
import SplitEditor from '@/features/transactions/SplitEditor';

/**
 * Charges the bank sent that nothing knew what to do with.
 *
 * It renders nothing at all when the queue is empty, which is the normal state
 * once a few rules exist — the inbox should be a place you visit rarely, not a
 * second data-entry screen.
 */
export default function ReviewInbox() {
  const { rows, approve, split, dismiss } = useInbox();
  const { isConfigured } = useBankConfig();
  const categories = useActiveCategories();

  if (!isConfigured || rows.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title={`${rows.length} to review`}
        description={
          categories.length === 0
            ? 'Create a category first — every expense belongs to one.'
            : 'From your bank, with no rule to file them. Picking a category files it and can remember the choice.'
        }
      />

      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <InboxRow
            key={row.id}
            row={row}
            categories={categories}
            onApprove={approve}
            onSplit={split}
            onDismiss={dismiss}
          />
        ))}
      </ul>
    </Card>
  );
}

interface InboxRowProps {
  row: PendingImport;
  categories: readonly Category[];
  onApprove: (
    importId: string,
    categoryId: string,
    ruleMatch?: string,
    fromPool?: boolean,
  ) => void;
  onSplit: (importId: string, parts: readonly SplitPart[]) => void;
  onDismiss: (importId: string) => void;
}

function InboxRow({ row, categories, onApprove, onSplit, onDismiss }: InboxRowProps) {
  const { format } = useMoney();
  const disabled = categories.length === 0;
  const [categoryId, setCategoryId] = useState('');
  const [remember, setRemember] = useState(true);
  const [fromPool, setFromPool] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const split = useSplit(row.amountCents);
  // Statement lines carry store numbers and city codes, so the rule text is
  // editable — "sq *blue bottle 4417" is not something to match on twice.
  const [match, setMatch] = useState(() => normalizeMerchant(row.merchant));

  return (
    <li className="border-border-subtle flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-content truncate text-sm font-medium">{row.merchant}</p>
          <p className="text-content-muted mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
            {formatDayLabel(row.date)}
            {row.pending && <Badge>Pending</Badge>}
            {row.reason === 'closed-month' && (
              <Badge tone="warning" title="Closed months are frozen, so this can't be filed there">
                {formatMonthLabel(monthKeyOfIsoDate(row.date))} is closed
              </Badge>
            )}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1">
          <span className="text-content text-sm font-semibold tabular-nums">
            {format(row.amountCents)}
          </span>
          {/* Dismissing is about the row, so it sits with the row's own header
              rather than competing for width with the two filing controls. */}
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Dismiss ${row.merchant}`}
            onClick={() => onDismiss(row.id)}
          >
            <Icon name="dismiss" />
          </Button>
        </span>
      </div>

      {splitting ? (
        <>
          <SplitEditor split={split} totalCents={row.amountCents} categories={categories} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSplitting(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={split.problem !== null}
              onClick={() => onSplit(row.id, split.toParts())}
            >
              <Icon name="approve" />
              File split
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Select
              aria-label={`Category for ${row.merchant}`}
              className="min-w-0 flex-1"
              value={categoryId}
              placeholder="Choose a category"
              options={categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
              disabled={disabled}
              onChange={(event) => setCategoryId(event.target.value)}
            />
            <Button
              variant="primary"
              className="shrink-0"
              disabled={disabled || !categoryId}
              onClick={() =>
                onApprove(row.id, categoryId, remember ? match : undefined, fromPool)
              }
            >
              <Icon name="approve" />
              File it
            </Button>
          </div>

          {/* The rule only means something once there is a category to point it at,
              so it stays out of the way until then — otherwise every row in the
              queue is twice as tall as the decision it is asking for. */}
          {categoryId && (
            <>
              <Toggle
                checked={remember}
                onChange={setRemember}
                label="Remember this merchant"
                description="File charges like this automatically from now on."
              />

              {remember && (
                <input
                  aria-label={`Rule text for ${row.merchant}`}
                  value={match}
                  onChange={(event) => setMatch(event.target.value)}
                  className={inputClasses}
                />
              )}

              {/* Not something a rule can learn: the next charge from this
                  merchant is an ordinary one until you say otherwise. */}
              <Toggle
                checked={fromPool}
                onChange={setFromPool}
                label="Pay from savings"
                description="Comes out of the pool instead of this month's budget."
              />
            </>
          )}

          {/* One charge, two categories: the shop that was half groceries and
              half a present. Needs two categories to exist before it can mean
              anything, so it only appears once there are. */}
          {categories.length > 1 && (
            <button
              type="button"
              onClick={() => setSplitting(true)}
              className="text-content-muted hover:text-brand self-start text-xs font-medium underline underline-offset-2"
            >
              Split across categories
            </button>
          )}
        </>
      )}
    </li>
  );
}
