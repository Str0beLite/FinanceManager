import type { ReactNode } from 'react';

type Tone = 'neutral' | 'positive' | 'warning' | 'danger' | 'brand';

const VALUE_TONES: Record<Tone, string> = {
  neutral: 'text-content',
  positive: 'text-positive',
  warning: 'text-warning',
  danger: 'text-danger',
  brand: 'text-brand',
};

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  action?: ReactNode;
}

export default function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  action,
}: StatTileProps) {
  return (
    <div className="bg-surface-raised border-border-subtle rounded-card flex flex-col border p-3 sm:p-4">
      <p className="text-content-muted text-[10px] font-medium tracking-wide uppercase sm:text-xs">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums sm:mt-2 sm:text-2xl ${VALUE_TONES[tone]}`}
      >
        {value}
      </p>
      {/* The hint is supporting detail — on a phone the number has to win. */}
      {hint && <p className="text-content-muted mt-1 hidden text-xs sm:block">{hint}</p>}
      {/* mt-auto pins the action to the bottom when grid siblings stretch this tile. */}
      {action && <div className="mt-auto pt-2 sm:pt-3">{action}</div>}
    </div>
  );
}
