import type { Field } from "@/lib/entries/fields";
export type Series = {
  label: string;
  color: string;
  points: { x: number; y: number | null; label: string }[];
};
export function Chart({
  series,
  field,
  maxX = 28,
}: {
  series: Series[];
  field: Field;
  maxX?: number;
}) {
  const width = 640,
    height = 220,
    x = (n: number) => 42 + ((n - 1) * 570) / Math.max(1, maxX - 1),
    y = (n: number) =>
      180 - ((n - field.min) * 150) / (field.max - field.min || 1);
  return (
    <div>
      <svg
        className="w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Courbes de ${field.label}. Les interruptions représentent les données absentes.`}
      >
        {[field.min, (field.min + field.max) / 2, field.max].map((n) => (
          <g key={n}>
            <line
              x1="42"
              x2="612"
              y1={y(n)}
              y2={y(n)}
              stroke="currentColor"
              opacity=".12"
            />
            <text x="7" y={y(n) + 4} fontSize="11" fill="currentColor">
              {n}
            </text>
          </g>
        ))}
        {series.map((s) => {
          const parts: { x: number; y: number | null; label: string }[][] = [];
          let part: typeof s.points = [];
          for (const p of s.points) {
            if (p.y === null) {
              if (part.length) parts.push(part);
              part = [];
            } else part.push(p);
          }
          if (part.length) parts.push(part);
          return (
            <g key={s.label}>
              {parts.map((p, i) => (
                <polyline
                  key={i}
                  points={p.map((v) => `${x(v.x)},${y(v.y!)}`).join(" ")}
                  stroke={s.color}
                  fill="none"
                  strokeWidth="2"
                />
              ))}
              {s.points
                .filter((p) => p.y !== null)
                .map((p) => (
                  <circle
                    key={p.x}
                    cx={x(p.x)}
                    cy={y(p.y!)}
                    r="3.5"
                    fill={s.color}
                  >
                    <title>
                      {s.label} · {p.label} : {p.y} {field.unit}
                    </title>
                  </circle>
                ))}
            </g>
          );
        })}
        <text x="42" y="209" fontSize="11" fill="currentColor">
          J1
        </text>
        <text x="585" y="209" fontSize="11" fill="currentColor">
          J{maxX}
        </text>
      </svg>
      <div className="flex flex-wrap gap-4 text-xs">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-2">
            <span className="size-2" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
