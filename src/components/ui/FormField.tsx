import { useId, type ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  /** Receives the id to bind to the control, so the label always points at it. */
  children: (id: string) => ReactNode;
}

/**
 * The single label/error/hint wrapper every form control in the app uses, so
 * accessibility and spacing can never drift between screens.
 */
export default function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-content text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-danger text-xs">{error}</p>
      ) : (
        hint && <p className="text-content-muted text-xs">{hint}</p>
      )}
    </div>
  );
}

/** Text size is set globally in index.css: 16px on mobile so iOS never zooms. */
export const inputClasses =
  'w-full rounded-lg border border-border-subtle bg-surface px-3 min-h-11 sm:min-h-0 sm:py-2 text-content placeholder:text-content-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';
