import { useEffect, useState } from 'react';
import { fromCents, parseMoney } from '@/lib/money';
import { inputClasses } from './FormField';

interface MoneyInputProps {
  id?: string;
  valueCents: number;
  onChange: (cents: number) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const toDraft = (cents: number): string => (cents === 0 ? '' : String(fromCents(cents)));

/**
 * A money field that reports whole cents.
 *
 * It keeps its own text draft while focused so that typing "1.", "0.0" or a
 * leading "-" isn't reformatted out from under the cursor; the draft resyncs
 * whenever the value changes from outside.
 */
export default function MoneyInput({
  id,
  valueCents,
  onChange,
  placeholder = '0.00',
  disabled,
  autoFocus,
}: MoneyInputProps) {
  const [draft, setDraft] = useState(() => toDraft(valueCents));

  useEffect(() => {
    // Ignore echoes of what the user is currently typing.
    if (parseMoney(draft) !== valueCents) setDraft(toDraft(valueCents));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft is intentionally not a trigger
  }, [valueCents]);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      className={`${inputClasses} text-right tabular-nums`}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(parseMoney(event.target.value));
      }}
      onBlur={() => setDraft(toDraft(parseMoney(draft)))}
    />
  );
}
