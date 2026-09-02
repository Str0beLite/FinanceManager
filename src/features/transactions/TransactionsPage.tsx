import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  EntityTable,
  Fab,
  Modal,
  type Column,
} from '@/components/ui';
import { ReviewInbox } from '@/features/bank';
import { useApp } from '@/hooks/useApp';
import { useCategoryLookup } from '@/hooks/useCategories';
import { useMoney } from '@/hooks/useMoney';
import {
  defaultDateInMonth,
  formatDayLabel,
  formatMonthLabel,
  monthKeyOfIsoDate,
} from '@/lib/dates';
import type { Transaction, TransactionDraft } from '@/types';
import TransactionForm from './TransactionForm';

export default function TransactionsPage() {
  const { state, dispatch, selectedMonth } = useApp();
  const { format } = useMoney();
  const categories = useCategoryLookup();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);

  const monthTransactions = useMemo(
    () =>
      state.transactions
        .filter((t) => monthKeyOfIsoDate(t.date) === selectedMonth)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.transactions, selectedMonth],
  );

  const total = monthTransactions.reduce((sum, t) => sum + t.amountCents, 0);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setFormOpen(true);
  };

  const handleSubmit = (drafts: readonly TransactionDraft[]) => {
    if (editing) {
      dispatch({ type: 'transaction/update', id: editing.id, changes: drafts[0] });
    } else {
      dispatch({ type: 'transaction/addMany', drafts });
    }
    setFormOpen(false);
    setEditing(null);
  };

  const columns: readonly Column<Transaction>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (t) => <span className="text-content-muted">{formatDayLabel(t.date)}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (t) => {
        const category = categories.get(t.categoryId);
        return (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: category?.color ?? 'var(--color-content-muted)' }}
            />
            <span className="truncate">{category?.name ?? 'Deleted category'}</span>
          </span>
        );
      },
    },
    {
      key: 'note',
      header: 'Note',
      // The badge is the only thing telling two shares of one purchase apart
      // from an expense entered twice by mistake. They behave identically
      // otherwise — each is edited and deleted on its own.
      render: (t) => (
        <span className="text-content-muted flex items-center gap-1.5">
          <span className="truncate">{t.note || '—'}</span>
          {t.split && <Badge>Split</Badge>}
          {t.fromPool && <Badge tone="brand">Savings</Badge>}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (t) => <span className="font-medium">{format(t.amountCents)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Above the ledger, because it is the thing that needs a decision. It
          renders nothing once the queue is empty. */}
      <ReviewInbox />

      <Card>
        <CardHeader
          title={`Expenses — ${formatMonthLabel(selectedMonth)}`}
          description={`${monthTransactions.length} logged, ${format(total)} total. Subscriptions are tracked separately.`}
          hideActionOnMobile
          action={
            <Button variant="primary" onClick={openNew} disabled={state.categories.length === 0}>
              Add expense
            </Button>
          }
        />

        <EntityTable
          items={monthTransactions}
          columns={columns}
          getKey={(t) => t.id}
          titleKey="category"
          emptyState={
            <EmptyState
              icon="spend"
              title="Nothing logged this month"
              description={
                state.categories.length === 0
                  ? 'Create a category first — every expense belongs to one.'
                  : 'Add an expense to see it counted against its category budget.'
              }
              action={
                state.categories.length > 0 && (
                  <Button variant="primary" onClick={openNew}>
                    Add expense
                  </Button>
                )
              }
            />
          }
          actions={(transaction) => (
            <>
              <Button size="sm" variant="ghost" onClick={() => openEdit(transaction)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  dispatch({ type: 'transaction/delete', id: transaction.id })
                }
              >
                Delete
              </Button>
            </>
          )}
        />
      </Card>

      {state.transactions.length > monthTransactions.length && (
        <p className="text-content-muted text-center text-xs">
          <Badge>
            {state.transactions.length - monthTransactions.length} expense
            {state.transactions.length - monthTransactions.length === 1 ? '' : 's'} in other
            months
          </Badge>{' '}
          — switch months from the header to see them.
        </p>
      )}

      {state.categories.length > 0 && <Fab label="Add expense" onClick={openNew} />}

      <Modal
        open={isFormOpen}
        title={editing ? 'Edit expense' : 'Add expense'}
        onClose={() => setFormOpen(false)}
      >
        <TransactionForm
          initial={editing}
          defaultDate={defaultDateInMonth(selectedMonth)}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
