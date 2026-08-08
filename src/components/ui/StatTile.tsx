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
    <div className="bg-surface-raised border-border-subtle rounded-card flex flex-col justify-between border p-4">
      <p className="text-content-muted text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${VALUE_TONES[tone]}`}>{value}</p>
      {hint && <p className="text-content-muted mt-1 text-xs">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
