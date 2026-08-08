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
import { useApp } from '@/hooks/useApp';
import { useCurrentMonth } from '@/hooks/useMonth';
import { useMoney } from '@/hooks/useMoney';
import { formatPercentBp } from '@/lib/validation';
import type { Category, CategoryDraft } from '@/types';
import AllocationSummary from './AllocationSummary';
import CategoryForm from './CategoryForm';

export default function CategoriesPage() {
  const { state, dispatch } = useApp();
  const { format } = useMoney();
  const { computation } = useCurrentMonth();
  const [editing, setEditing] = useState<Category | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const budgetByCategory = useMemo(
    () => new Map(computation.categories.map((c) => [c.categoryId, c.budgetCents])),
    [computation],
  );

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSubmit = (draft: CategoryDraft) => {
    if (editing) {
      dispatch({ type: 'category/update', id: editing.id, changes: draft });
    } else {
      dispatch({ type: 'category/add', draft });
    }
    setFormOpen(false);
    setEditing(null);
  };

  const usageCount = (category: Category) =>
    state.transactions.filter((t) => t.categoryId === category.id).length +
    state.subscriptions.filter((s) => s.categoryId === category.id).length;

  const columns: readonly Column<Category>[] = [
    {
      key: 'name',
      header: 'Category',
      render: (category) => (
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className={category.archived ? 'text-content-muted line-through' : ''}>
            {category.name}
          </span>
          {category.hardSet && (
            <Badge tone="brand" title="Never reduced by a rollover deficit">
              🔒 Hard set
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'allocation',
      header: 'Allocation',
      render: (category) =>
        category.allocationType === 'fixed' ? (
          <span className="text-content-muted">{format(category.fixedCents)} fixed</span>
        ) : (
          <span className="text-content-muted">
            {formatPercentBp(category.percentBp)} of remainder
          </span>
        ),
    },
    {
      key: 'budget',
      header: 'This month',
      align: 'right',
      render: (category) => format(budgetByCategory.get(category.id) ?? 0),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <AllocationSummary computation={computation} />

      <Card>
        <CardHeader
          title="Categories"
          description="Fixed amounts come off the top. Percentages split what's left. Hard-set categories are protected from rollover cuts."
          hideActionOnMobile
          action={
            <Button variant="primary" onClick={openNew}>
              Add category
            </Button>
          }
        />

        <EntityTable
          items={state.categories}
          columns={columns}
          getKey={(category) => category.id}
          emptyState={
            <EmptyState
              icon="🗂️"
              title="No categories yet"
              description="Start with your biggest fixed bill — rent or a mortgage — then add percentage categories for the rest."
              action={
                <Button variant="primary" onClick={openNew}>
                  Add your first category
                </Button>
              }
            />
          }
          actions={(category) => (
            <>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Move ${category.name} up`}
                onClick={() =>
                  dispatch({ type: 'category/reorder', id: category.id, direction: 'up' })
                }
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Move ${category.name} down`}
                onClick={() =>
                  dispatch({ type: 'category/reorder', id: category.id, direction: 'down' })
                }
              >
                ↓
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(category);
                  setFormOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  dispatch({
                    type: 'category/setArchived',
                    id: category.id,
                    archived: !category.archived,
                  })
                }
              >
                {category.archived ? 'Restore' : 'Archive'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPendingDelete(category)}>
                Delete
              </Button>
            </>
          )}
        />
      </Card>

      {state.categories.length > 0 && <Fab label="Add category" onClick={openNew} />}

      <Modal
        open={isFormOpen}
        title={editing ? 'Edit category' : 'Add category'}
        onClose={() => setFormOpen(false)}
      >
        <CategoryForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Modal
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.name ?? ''}?`}
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingDelete) {
                  dispatch({ type: 'category/delete', id: pendingDelete.id });
                }
                setPendingDelete(null);
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-content-muted text-sm">
          {pendingDelete && usageCount(pendingDelete) > 0 ? (
            <>
              This will also delete{' '}
              <span className="text-content font-medium">
                {usageCount(pendingDelete)} linked expense
                {usageCount(pendingDelete) === 1 ? '' : 's'} and subscription
                {usageCount(pendingDelete) === 1 ? '' : 's'}
              </span>
              , and past months will no longer show them. Archive it instead to keep the
              history.
            </>
          ) : (
            'This category has no linked records, so nothing else is affected.'
          )}
        </p>
      </Modal>
    </div>
  );
}
