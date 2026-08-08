import { useMemo, useState } from 'react';
import { Button, Card, CardHeader, FormField, MoneyInput, inputClasses } from '@/components/ui';
import { useApp } from '@/hooks/useApp';
import { useMoney } from '@/hooks/useMoney';
import { formatDayLabel, monthKeyOfIsoDate } from '@/lib/dates';

interface IncomeCardProps {
  monthKey: string;
  readOnly: boolean;
}

/** Extra money that arrived on top of the paycheck — a bonus, refund, side gig. */
export default function IncomeCard({ monthKey, readOnly }: IncomeCardProps) {
  const { state, dispatch } = useApp();
  const { format } = useMoney();
  const [label, setLabel] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  // Extra income is occasional, so the form stays folded away until asked for.
  const [isFormOpen, setFormOpen] = useState(false);

  const entries = useMemo(
    () =>
      state.incomes
        .filter((entry) => monthKeyOfIsoDate(entry.date) === monthKey)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [state.incomes, monthKey],
  );

  const total = entries.reduce((sum, entry) => sum + entry.amountCents, 0);

  const add = () => {
    if (amountCents <= 0) return;
    dispatch({
      type: 'income/add',
      draft: {
        label: label.trim() || 'Extra income',
        amountCents,
        date: `${monthKey}-01`,
      },
    });
    setLabel('');
    setAmountCents(0);
    setFormOpen(false);
  };

  return (
    <Card>
      <CardHeader
        title="Extra income"
        description={
          total > 0 ? `${format(total)} on top of your paycheck.` : 'Bonuses, refunds, side gigs.'
        }
      />

      {entries.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="border-border-subtle flex items-center justify-between gap-2 border-b pb-2 text-sm last:border-0 last:pb-0"
            >
              <span className="min-w-0">
                <span className="text-content block truncate">{entry.label}</span>
                <span className="text-content-muted text-xs">{formatDayLabel(entry.date)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-positive font-medium tabular-nums">
                  +{format(entry.amountCents)}
                </span>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${entry.label}`}
                    onClick={() => dispatch({ type: 'income/delete', id: entry.id })}
                  >
                    ×
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && !isFormOpen && (
        <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
          + Add extra income
        </Button>
      )}

      {!readOnly && isFormOpen && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <FormField label="Description">
            {(id) => (
              <input
                id={id}
                type="text"
                className={inputClasses}
                value={label}
                placeholder="Work bonus"
                onChange={(event) => setLabel(event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Amount">
            {(id) => (
              <MoneyInput id={id} valueCents={amountCents} onChange={setAmountCents} />
            )}
          </FormField>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={amountCents <= 0}
              className="flex-1 sm:flex-none"
            >
              Add income
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
