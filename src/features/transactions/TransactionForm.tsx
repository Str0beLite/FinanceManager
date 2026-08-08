import { useState } from 'react';
import { Button, FormField, MoneyInput, Select, inputClasses } from '@/components/ui';
import { useActiveCategories } from '@/hooks/useCategories';
import { todayIsoDate } from '@/lib/dates';
import { validatePositiveAmount } from '@/lib/validation';
import type { Transaction, TransactionDraft } from '@/types';

interface TransactionFormProps {
  initial?: Transaction | null;
  /** Pre-selects a category, e.g. when adding from a dashboard card. */
  defaultCategoryId?: string;
  /** Pre-fills the date to the 1st of the month being viewed. */
  defaultDate?: string;
  onSubmit: (draft: TransactionDraft) => void;
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

  const amountError = submitted ? validatePositiveAmount(amountCents) : undefined;
  const categoryError = submitted && !categoryId ? 'Pick a category.' : undefined;

  const handleSubmit = () => {
    setSubmitted(true);
    if (!categoryId || amountCents <= 0) return;
    onSubmit({ categoryId, amountCents, date, note: note.trim() });
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
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

      <FormField label="Amount" error={amountError}>
        {(id) => (
          <MoneyInput id={id} valueCents={amountCents} onChange={setAmountCents} autoFocus />
        )}
      </FormField>

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
          {initial ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </form>
  );
}
