interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: ToggleProps) {
  return (
    <label
      className={`flex items-start gap-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        /*
         * The switch reads as 20px tall but is hit as 40px: the track sits
         * inside a taller button, pulled back out of the flow by -my-2.5 so a
         * thumb has something to aim at without the row growing around it.
         */
        className="-my-2.5 flex h-10 w-9 shrink-0 items-center"
      >
        <span
          className={`flex h-5 w-9 items-center rounded-full transition-colors ${
            checked ? 'bg-brand' : 'bg-border-subtle'
          }`}
        >
          <span
            className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              checked ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>
      <span>
        <span className="text-content block text-sm font-medium">{label}</span>
        {description && (
          <span className="text-content-muted block text-xs">{description}</span>
        )}
      </span>
    </label>
  );
}
