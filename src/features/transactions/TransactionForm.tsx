import { useState } from 'react';
import { Button, FormField, MoneyInput, Select, inputClasses } from '@/components/ui';
import { useActiveCategories } from '@/hooks/useCategories';
import { useSplit } from '@/hooks/useSplit';
import { todayIsoDate } from '@/lib/dates';
import { validatePositiveAmount } from '@/lib/validation';
import type { Transaction, TransactionDraft } from '@/types';
import SplitEditor from './SplitEditor';

interface TransactionFormProps {
  initial?: Transaction | null;
  /** Pre-selects a category, e.g. when adding from a dashboard card. */
  defaultCategoryId?: string;
  /** Pre-fills the date. Today when today is in the month being viewed. */
  defaultDate?: string;
  /**
   * One draft normally; several when the expense was split, which is why this
   * takes a list rather than the caller having to know which case it got.
   */
  onSubmit: (drafts: readonly TransactionDraft[]) => void;
  onCancel: () => void;
}

export default function TransactionForm({
  initial,
  defaultCategoryId,
  defaultDate,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const categories = useActiveCategories();
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '',
  );
  const [amountCents, setAmountCents] = useState(initial?.amountCents ?? 0);
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayIsoDate());
  const [note, setNote] = useState(initial?.note ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [splitting, setSplitting] = useState(false);

  const split = useSplit(amountCents);

  // Editing means one existing row, which cannot become several without
  // deciding what happened to the original. Splitting is for new expenses.
  const canSplit = !initial && categories.length > 1;

  const amountError = submitted ? validatePositiveAmount(amountCents) : undefined;
  const categoryError = submitted && !categoryId && !splitting ? 'Pick a category.' : undefined;

  const handleSubmit = () => {
    setSubmitted(true);
    if (amountCents <= 0) return;

    if (splitting) {
      if (split.problem) return;
      onSubmit(
        split.toParts().map((part) => ({
          categoryId: part.categoryId,
          amountCents: part.amountCents,
          date,
          note: note.trim(),
          split: true,
        })),
      );
      return;
    }

    if (!categoryId) return;
    onSubmit([{ categoryId, amountCents, date, note: note.trim() }]);
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <FormField label="Amount" error={amountError}>
        {(id) => (
          <MoneyInput id={id} valueCents={amountCents} onChange={setAmountCents} autoFocus />
        )}
      </FormField>

      {splitting ? (
        <FormField
          label="Split across categories"
          hint="Each part becomes its own expense, edited and deleted on its own."
        >
          {() => <SplitEditor split={split} totalCents={amountCents} categories={categories} />}
        </FormField>
      ) : (
        <FormField label="Category" error={categoryError}>
          {(id) => (
            <Select
              id={id}
              value={categoryId}
              placeholder="Choose a category"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(event) => setCategoryId(event.target.value)}
            />
          )}
        </FormField>
      )}

      {/* Amount first, then how to file it: a split is a decision about money
          that has already been named, and the editor needs the amount to halve. */}
      {canSplit && (
        <button
          type="button"
          onClick={() => setSplitting(!splitting)}
          className="text-content-muted hover:text-brand self-start text-xs font-medium underline underline-offset-2"
        >
          {splitting ? 'Use one category' : 'Split across categories'}
        </button>
      )}

      <FormField label="Date" hint="Its month decides which budget it counts against.">
        {(id) => (
          <input
            id={id}
            type="date"
            className={inputClasses}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        )}
      </FormField>

      <FormField label="Note" hint="Optional.">
        {(id) => (
          <input
            id={id}
            type="text"
            className={inputClasses}
            value={note}
            placeholder="Groceries at the market"
            onChange={(event) => setNote(event.target.value)}
          />
        )}
      </FormField>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          {initial ? 'Save changes' : splitting ? 'Add expenses' : 'Add expense'}
        </Button>
      </div>
    </form>
  );
}
