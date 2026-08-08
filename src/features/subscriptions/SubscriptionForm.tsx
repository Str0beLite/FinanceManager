import { useState } from 'react';
import { Button, FormField, MoneyInput, Select, Toggle, inputClasses } from '@/components/ui';
import { CADENCES } from '@/config/cadences';
import { useActiveCategories } from '@/hooks/useCategories';
import { monthKeyOf } from '@/lib/dates';
import { validatePositiveAmount } from '@/lib/validation';
import type { Cadence, Subscription, SubscriptionDraft } from '@/types';

interface SubscriptionFormProps {
  initial?: Subscription | null;
  defaultMonth?: string;
  onSubmit: (draft: SubscriptionDraft) => void;
  onCancel: () => void;
}

export default function SubscriptionForm({
  initial,
  defaultMonth,
  onSubmit,
  onCancel,
}: SubscriptionFormProps) {
  const categories = useActiveCategories();
  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');
  const [amountCents, setAmountCents] = useState(initial?.amountCents ?? 0);
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence ?? 'monthly');
  const [startMonth, setStartMonth] = useState(
    initial?.startMonth ?? defaultMonth ?? monthKeyOf(),
  );
  const [endMonth, setEndMonth] = useState(initial?.endMonth ?? '');
  const [billingDay, setBillingDay] = useState(initial?.billingDay ?? 1);
  const [active, setActive] = useState(initial?.active ?? true);
  const [submitted, setSubmitted] = useState(false);

  const amountError = submitted ? validatePositiveAmount(amountCents) : undefined;
  const nameError = submitted && !name.trim() ? 'Give the subscription a name.' : undefined;
  const categoryError = submitted && !categoryId ? 'Pick a category.' : undefined;

  const handleSubmit = () => {
    setSubmitted(true);
    if (!name.trim() || !categoryId || amountCents <= 0) return;

    onSubmit({
      name: name.trim(),
      categoryId,
      amountCents,
      cadence,
      startMonth,
      endMonth: endMonth || null,
      billingDay: Math.min(31, Math.max(1, billingDay)),
      active,
    });
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <FormField label="Name" error={nameError}>
        {(id) => (
          <input
            id={id}
            type="text"
            className={inputClasses}
            value={name}
            placeholder="Netflix"
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </FormField>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount" error={amountError}>
          {(id) => (
            <MoneyInput id={id} valueCents={amountCents} onChange={setAmountCents} />
          )}
        </FormField>

        <FormField label="Bills">
          {(id) => (
            <Select
              id={id}
              value={cadence}
              options={CADENCES.map((c) => ({ value: c.value, label: c.label }))}
              onChange={(event) => setCadence(event.target.value as Cadence)}
            />
          )}
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="First billing month"
          hint={
            cadence === 'monthly'
              ? undefined
              : 'Also sets the cycle — a quarterly starting in February bills Feb, May, Aug, Nov.'
          }
        >
          {(id) => (
            <input
              id={id}
              type="month"
              className={inputClasses}
              value={startMonth}
              onChange={(event) => setStartMonth(event.target.value)}
            />
          )}
        </FormField>

        <FormField label="Day of month" hint="For your reference — the full charge is budgeted from day one.">
          {(id) => (
            <input
              id={id}
              type="number"
              min="1"
              max="31"
              className={`${inputClasses} text-right tabular-nums`}
              value={billingDay}
              onChange={(event) => setBillingDay(Number.parseInt(event.target.value, 10) || 1)}
            />
          )}
        </FormField>
      </div>

      <FormField label="Last billing month" hint="Leave empty if it runs indefinitely.">
        {(id) => (
          <input
            id={id}
            type="month"
            className={inputClasses}
            value={endMonth}
            min={startMonth}
            onChange={(event) => setEndMonth(event.target.value)}
          />
        )}
      </FormField>

      <Toggle
        checked={active}
        onChange={setActive}
        label="Active"
        description="Pause it to stop it counting against your budget without deleting the record."
      />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          {initial ? 'Save changes' : 'Add subscription'}
        </Button>
      </div>
    </form>
  );
}
