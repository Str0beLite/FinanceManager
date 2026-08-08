import { WARN_THRESHOLD } from '@/config/constants';

interface ProgressBarProps {
  /** spent / budget. Values above 1 mean the category is over. */
  ratio: number;
  /** Category colour, used while spending is comfortably within budget. */
  color?: string;
  label?: string;
}

export default function ProgressBar({ ratio, color, label }: ProgressBarProps) {
  const isOver = ratio > 1;
  const isNear = !isOver && ratio >= WARN_THRESHOLD;
  const width = Math.min(100, Math.max(0, ratio * 100));

  // Warning and over states override the category colour — the status matters
  // more than the colour-coding at that point.
  const fill = isOver
    ? 'var(--color-danger)'
    : isNear
      ? 'var(--color-warning)'
      : (color ?? 'var(--color-brand)');

  return (
    <div
      className="bg-surface-muted h-2 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width,background-color] duration-300"
        style={{ width: `${width}%`, backgroundColor: fill }}
      />
    </div>
  );
}
