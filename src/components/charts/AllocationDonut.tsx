export interface DonutSlice {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly valueCents: number;
}

interface AllocationDonutProps {
  slices: readonly DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

/**
 * A donut drawn with stroke-dasharray on concentric circles — no chart library,
 * no layout thrash, and it scales with the container.
 */
export default function AllocationDonut({
  slices,
  size = 168,
  thickness = 22,
  centerLabel,
  centerValue,
}: AllocationDonutProps) {
  const total = slices.reduce((sum, slice) => sum + slice.valueCents, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = slices
    .filter((slice) => slice.valueCents > 0)
    .map((slice) => {
      const fraction = total > 0 ? slice.valueCents / total : 0;
      const arc = {
        ...slice,
        dash: fraction * circumference,
        // Negative offset walks clockwise from the top (see the -90° rotation).
        offset: -offset,
      };
      offset += fraction * circumference;
      return arc;
    });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={
        total > 0
          ? `Allocation: ${slices.map((s) => s.label).join(', ')}`
          : 'No allocation yet'
      }
      className="shrink-0"
    >
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-surface-muted"
        />
        {arcs.map((arc) => (
          <circle
            key={arc.id}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={thickness}
            strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
            strokeDashoffset={arc.offset}
          >
            <title>{arc.label}</title>
          </circle>
        ))}
      </g>

      {(centerValue || centerLabel) && (
        <>
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-content text-lg font-semibold tabular-nums"
          >
            {centerValue}
          </text>
          <text
            x="50%"
            y="62%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-content-muted text-[10px] tracking-wide uppercase"
          >
            {centerLabel}
          </text>
        </>
      )}
    </svg>
  );
}
