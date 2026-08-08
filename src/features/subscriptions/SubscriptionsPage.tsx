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
  StatTile,
  type Column,
} from '@/components/ui';
import { cadenceLabel } from '@/config/cadences';
import { useApp } from '@/hooks/useApp';
import { useCategoryLookup } from '@/hooks/useCategories';
import { useMoney } from '@/hooks/useMoney';
import { formatMonthLabelShort, ordinal } from '@/lib/dates';
import { annualCostCents, isDueInMonth } from '@/lib/subscriptions';
import type { Subscription, SubscriptionDraft } from '@/types';
import SubscriptionForm from './SubscriptionForm';

export default function SubscriptionsPage() {
  const { state, dispatch, selectedMonth } = useApp();
  const { format } = useMoney();
  const categories = useCategoryLookup();
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);

  const { dueThisMonth, yearlyTotal } = useMemo(() => {
    const due = state.subscriptions.filter((s) => isDueInMonth(s, selectedMonth));
    return {
      dueThisMonth: due.reduce((sum, s) => sum + s.amountCents, 0),
      yearlyTotal: state.subscriptions
        .filter((s) => s.active)
        .reduce((sum, s) => sum + annualCostCents(s), 0),
    };
  }, [state.subscriptions, selectedMonth]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSubmit = (draft: SubscriptionDraft) => {
    if (editing) {
      dispatch({ type: 'subscription/update', id: editing.id, changes: draft });
    } else {
      dispatch({ type: 'subscription/add', draft });
    }
    setFormOpen(false);
    setEditing(null);
  };

  const columns: readonly Column<Subscription>[] = [
    {
      key: 'name',
      header: 'Subscription',
      render: (subscription) => (
        <span className="flex items-center gap-2">
          <span className={subscription.active ? '' : 'text-content-muted line-through'}>
            {subscription.name}
          </span>
          {isDueInMonth(subscription, selectedMonth) && (
            <Badge tone="brand">Due this month</Badge>
          )}
          {!subscription.active && <Badge>Paused</Badge>}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (subscription) => {
        const category = categories.get(subscription.categoryId);
        return (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: category?.color ?? 'var(--color-content-muted)' }}
            />
            <span className="text-content-muted truncate">
              {category?.name ?? 'Deleted category'}
            </span>
          </span>
        );
      },
    },
    {
      key: 'cadence',
      header: 'Schedule',
      render: (subscription) => (
        <span className="text-content-muted">
          {cadenceLabel(subscription.cadence)} on the {ordinal(subscription.billingDay)}
          {subscription.endMonth && ` · ends ${formatMonthLabelShort(subscription.endMonth)}`}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (subscription) => (
        <span className="font-medium">{format(subscription.amountCents)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Billing this month"
          value={format(dueThisMonth)}
          hint="Already counted against your categories"
        />
        <StatTile
          label="Yearly commitment"
          value={format(yearlyTotal)}
          hint="All active subscriptions, annualised"
          tone="brand"
        />
      </div>

      <Card>
        <CardHeader
          title="Subscriptions"
          description="Recurring charges. The full amount is committed on day one of each billing month, so nothing sneaks up on you later."
          hideActionOnMobile
          action={
            <Button
              variant="primary"
              onClick={openNew}
              disabled={state.categories.length === 0}
            >
              Add subscription
            </Button>
          }
        />

        <EntityTable
          items={state.subscriptions}
          columns={columns}
          getKey={(subscription) => subscription.id}
          emptyState={
            <EmptyState
              icon="🔁"
              title="No subscriptions yet"
              description={
                state.categories.length === 0
                  ? 'Create a category first — every subscription is charged to one.'
                  : 'Add the recurring charges you already know about, and they will be budgeted every month automatically.'
              }
              action={
                state.categories.length > 0 && (
                  <Button variant="primary" onClick={openNew}>
                    Add subscription
                  </Button>
                )
              }
            />
          }
          actions={(subscription) => (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  dispatch({ type: 'subscription/toggleActive', id: subscription.id })
                }
              >
                {subscription.active ? 'Pause' : 'Resume'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(subscription);
                  setFormOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  dispatch({ type: 'subscription/delete', id: subscription.id })
                }
              >
                Delete
              </Button>
            </>
          )}
        />
      </Card>

      {state.categories.length > 0 && <Fab label="Add subscription" onClick={openNew} />}

      <Modal
        open={isFormOpen}
        title={editing ? 'Edit subscription' : 'Add subscription'}
        onClose={() => setFormOpen(false)}
      >
        <SubscriptionForm
          initial={editing}
          defaultMonth={selectedMonth}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
