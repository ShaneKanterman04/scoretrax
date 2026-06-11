import type { HotColdZone } from "@/lib/types";

// 3x3 strike zone grid (catcher's view) colored by the API-provided rgba
// values. Zones "01".."09" run row-major from top-left; outside zones
// (11-14) are omitted for compactness.
const CELL = 24;
const GAP = 2;
const SIZE = CELL * 3 + GAP * 2;

export default function HotColdZoneGrid({ zones }: { zones: HotColdZone[] }) {
  const inZone = zones.filter((z) => Number(z.zone) >= 1 && Number(z.zone) <= 9);
  if (inZone.length === 0) return null;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-[74px] w-[74px] shrink-0">
      {inZone.map((z) => {
        const n = Number(z.zone) - 1;
        const x = (n % 3) * (CELL + GAP);
        const y = Math.floor(n / 3) * (CELL + GAP);
        return (
          <g key={z.zone}>
            <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={3}
              style={{ fill: z.color }}
            />
            <text
              x={x + CELL / 2}
              y={y + CELL / 2 + 3}
              textAnchor="middle"
              className="fill-background text-[7px] font-bold"
            >
              {z.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
