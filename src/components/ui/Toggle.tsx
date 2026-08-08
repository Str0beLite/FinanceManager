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
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-border-subtle'
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
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
