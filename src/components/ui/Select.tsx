import type { SelectHTMLAttributes } from 'react';
import { inputClasses } from './FormField';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: readonly SelectOption[];
  placeholder?: string;
}

export default function Select({
  options,
  placeholder,
  className = '',
  ...rest
}: SelectProps) {
  return (
    <select className={`${inputClasses} ${className}`} {...rest}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
