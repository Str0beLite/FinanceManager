import type { ReactNode } from 'react';

type Tone = 'neutral' | 'brand' | 'positive' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-content-muted',
  brand: 'bg-brand-soft text-brand',
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  title?: string;
}

export default function Badge({ tone = 'neutral', children, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
