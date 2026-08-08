export interface BarSegment {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly valueCents: number;
}

interface AllocationBarProps {
  segments: readonly BarSegment[];
}

/**
 * The allocation split as a single stacked bar — the donut's information in one
 * row instead of a 168px square, which is the trade a phone screen wants.
 */
export default function AllocationBar({ segments }: AllocationBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.valueCents, 0);
  if (total <= 0) return null;

  return (
    <div
      className="bg-surface-muted flex h-2.5 w-full overflow-hidden rounded-full"
      role="img"
      aria-label={`Budget split across ${segments.length} categories`}
    >
      {segments
        .filter((segment) => segment.valueCents > 0)
        .map((segment) => (
          <span
            key={segment.id}
            title={segment.label}
            style={{
              width: `${(segment.valueCents / total) * 100}%`,
              backgroundColor: segment.color,
            }}
          />
        ))}
    </div>
  );
}
