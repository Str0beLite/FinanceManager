import { useState } from 'react';
import {
  Button,
  FormField,
  MoneyInput,
  Select,
  Toggle,
  inputClasses,
} from '@/components/ui';
import { CATEGORY_COLORS, nextCategoryColor } from '@/config/palette';
import { useCategories } from '@/hooks/useCategories';
import { bpFromPercent, percentFromBp, validateCategoryName } from '@/lib/validation';
import type { AllocationType, Category, CategoryDraft } from '@/types';

interface CategoryFormProps {
  initial?: Category | null;
  onSubmit: (draft: CategoryDraft) => void;
  onCancel: () => void;
}

const ALLOCATION_OPTIONS = [
  { value: 'percent', label: 'Percentage of what is left' },
  { value: 'fixed', label: 'Fixed amount off the top' },
];

export default function CategoryForm({ initial, onSubmit, onCancel }: CategoryFormProps) {
  const categories = useCategories();
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(
    initial?.color ?? nextCategoryColor(categories.map((c) => c.color)),
  );
  const [allocationType, setAllocationType] = useState<AllocationType>(
    initial?.allocationType ?? 'percent',
  );
  const [fixedCents, setFixedCents] = useState(initial?.fixedCents ?? 0);
  const [percentInput, setPercentInput] = useState(
    initial ? String(percentFromBp(initial.percentBp)) : '',
  );
  const [hardSet, setHardSet] = useState(initial?.hardSet ?? false);
  const [submitted, setSubmitted] = useState(false);

  const percentBp = bpFromPercent(Number.parseFloat(percentInput) || 0);
  const nameError = submitted
    ? validateCategoryName(name, categories, initial?.id)
    : undefined;
  const valueError =
    submitted && allocationType === 'fixed' && fixedCents <= 0
      ? 'Enter an amount greater than zero.'
      : submitted && allocationType === 'percent' && percentBp <= 0
        ? 'Enter a percentage greater than zero.'
        : undefined;

  const handleSubmit = () => {
    setSubmitted(true);
    if (validateCategoryName(name, categories, initial?.id)) return;
    if (allocationType === 'fixed' ? fixedCents <= 0 : percentBp <= 0) return;

    onSubmit({
      name: name.trim(),
      color,
      allocationType,
      fixedCents: allocationType === 'fixed' ? fixedCents : 0,
      percentBp: allocationType === 'percent' ? percentBp : 0,
      hardSet,
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
            placeholder="Groceries"
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </FormField>

      <FormField
        label="How is it funded?"
        hint="Fixed amounts are taken out first; percentages split whatever remains."
      >
        {(id) => (
          <Select
            id={id}
            value={allocationType}
            options={ALLOCATION_OPTIONS}
            onChange={(event) => setAllocationType(event.target.value as AllocationType)}
          />
        )}
      </FormField>

      {allocationType === 'fixed' ? (
        <FormField label="Amount each month" error={valueError}>
          {(id) => (
            <MoneyInput id={id} valueCents={fixedCents} onChange={setFixedCents} />
          )}
        </FormField>
      ) : (
        <FormField label="Percentage" error={valueError}>
          {(id) => (
            <div className="flex items-center gap-2">
              <input
                id={id}
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={`${inputClasses} text-right tabular-nums`}
                value={percentInput}
                placeholder="25"
                onChange={(event) => setPercentInput(event.target.value)}
              />
              <span className="text-content-muted text-sm">%</span>
            </div>
          )}
        </FormField>
      )}

      <FormField label="Colour">
        {() => (
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Use colour ${option}`}
                aria-pressed={color === option}
                onClick={() => setColor(option)}
                className={`size-7 rounded-full transition-transform ${
                  color === option
                    ? 'ring-brand scale-110 ring-2 ring-offset-2 ring-offset-[var(--color-surface-raised)]'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: option }}
              />
            ))}
          </div>
        )}
      </FormField>

      <Toggle
        checked={hardSet}
        onChange={setHardSet}
        label="Hard set"
        description="Always costs the same. A negative rollover never reduces this category — the cut goes to the flexible ones instead."
      />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          {initial ? 'Save changes' : 'Add category'}
        </Button>
      </div>
    </form>
  );
}
