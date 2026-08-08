import { useState } from 'react';
import AllocationDonut from '@/components/charts/AllocationDonut';
import { Badge, Button, Card, CardHeader, EmptyState, Fab, Modal } from '@/components/ui';
import { useApp } from '@/hooks/useApp';
import { useAllocationStatus } from '@/hooks/useCategories';
import { useCurrentMonth } from '@/hooks/useMonth';
import { useMoney } from '@/hooks/useMoney';
import { IncomeCard } from '@/features/income';
import { TransactionForm } from '@/features/transactions';
import type { PageId } from '@/app/navigation';
import CategoryCard from './CategoryCard';
import DeficitBanner from './DeficitBanner';
import MonthSelector from './MonthSelector';
import MonthStats from './MonthStats';
import PaycheckCard from './PaycheckCard';

interface DashboardProps {
  onNavigate: (page: PageId) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { state, dispatch } = useApp();
  const { format } = useMoney();
  const allocation = useAllocationStatus();
  const {
    monthKey,
    record,
    computation,
    paycheckCents,
    isClosed,
    canClose,
    selectMonth,
  } = useCurrentMonth();

  // `null` means closed; an object opens the sheet, optionally pre-picking a category.
  const [quickAdd, setQuickAdd] = useState<{ categoryId?: string } | null>(null);

  const hasCategories = state.categories.some((category) => !category.archived);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSelector monthKey={monthKey} onSelect={selectMonth} isClosed={isClosed} />
        {isClosed && (
          <Button
            size="sm"
            onClick={() => dispatch({ type: 'month/reopen', key: monthKey })}
          >
            Reopen month
          </Button>
        )}
      </div>

      <MonthStats
        computation={computation}
        poolCents={state.rolloverPoolCents}
        isClosed={isClosed}
        canClose={canClose}
        onCloseMonth={() => dispatch({ type: 'month/close', key: monthKey })}
      />

      <DeficitBanner
        computation={computation}
        poolCents={state.rolloverPoolCents}
        readOnly={isClosed}
        onApplyPool={() =>
          dispatch({
            type: 'month/applyPool',
            key: monthKey,
            amountCents: state.rolloverPoolCents,
          })
        }
      />

      {computation.overcommitted && (
        <div className="border-danger/40 bg-danger-soft rounded-card border p-4">
          <h2 className="text-content text-sm font-semibold">
            Fixed costs exceed this month&rsquo;s income
          </h2>
          <p className="text-content-muted mt-1 text-sm">
            Your fixed categories total {format(computation.fixedTotalCents)} against{' '}
            {format(computation.incomeCents)} of income, so the percentage categories get
            nothing. Raise the paycheck or lower a fixed amount.
          </p>
        </div>
      )}

      {!allocation.isBalanced && hasCategories && (
        <div className="border-warning/40 bg-warning-soft rounded-card flex flex-wrap items-center justify-between gap-3 border p-4">
          <p className="text-content-muted text-sm">
            Your percentage categories add up to{' '}
            <span className="text-content font-medium">
              {(allocation.percentTotalBp / 100).toFixed(2)}%
            </span>
            , not 100%.
          </p>
          <Button size="sm" onClick={() => onNavigate('categories')}>
            Fix allocation
          </Button>
        </div>
      )}

      {hasCategories ? (
        <>
          {/* The donut restates what the category cards below already show, so on a
              phone it is pure scroll cost — desktop has the room to spare. */}
          <Card className="hidden sm:block">
            <CardHeader
              title="Where the money goes"
              description={`${computation.categories.length} categories this month.`}
            />
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <AllocationDonut
                slices={computation.categories.map((category) => ({
                  id: category.categoryId,
                  label: `${category.name}: ${format(category.budgetCents)}`,
                  color: category.color,
                  valueCents: category.budgetCents,
                }))}
                centerValue={format(computation.totalBudgetCents)}
                centerLabel="Budgeted"
              />
              <ul className="flex w-full flex-col gap-2">
                {computation.categories.map((category) => (
                  <li
                    key={category.categoryId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-content truncate">{category.name}</span>
                      {category.hardSet && <Badge tone="brand">🔒</Badge>}
                    </span>
                    <span className="text-content-muted shrink-0 tabular-nums">
                      {format(category.budgetCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {computation.categories.map((category) => (
              <CategoryCard
                key={category.categoryId}
                category={category}
                onAddSpending={
                  isClosed ? undefined : (categoryId) => setQuickAdd({ categoryId })
                }
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon="📊"
          title="Set up your first category"
          description="Categories decide how each paycheck is split. Add a fixed one for rent, then percentage ones for everything else."
          action={
            <Button variant="primary" onClick={() => onNavigate('categories')}>
              Add a category
            </Button>
          }
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <PaycheckCard record={record} paycheckCents={paycheckCents} readOnly={isClosed} />
        <IncomeCard monthKey={monthKey} readOnly={isClosed} />
      </div>

      {hasCategories && !isClosed && (
        <Fab label="Add expense" onClick={() => setQuickAdd({})} />
      )}

      <Modal open={quickAdd !== null} title="Add expense" onClose={() => setQuickAdd(null)}>
        <TransactionForm
          defaultCategoryId={quickAdd?.categoryId}
          defaultDate={`${monthKey}-01`}
          onSubmit={(draft) => {
            dispatch({ type: 'transaction/add', draft });
            setQuickAdd(null);
          }}
          onCancel={() => setQuickAdd(null)}
        />
      </Modal>
    </div>
  );
}
