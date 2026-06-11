import type { Pitch } from "@/lib/types";

// Strike zone plot from catcher's perspective. x = pX in feet (plate is
// 17 in wide -> ±0.83 ft including ball radius), y = pZ in feet above plate.
const X_MIN = -2.2;
const X_MAX = 2.2;
const Y_MIN = 0;
const Y_MAX = 4.6;
const W = 150;
const H = 190;

function toSvg(px: number, pz: number): [number, number] {
  const x = ((px - X_MIN) / (X_MAX - X_MIN)) * W;
  const y = H - ((pz - Y_MIN) / (Y_MAX - Y_MIN)) * H;
  return [x, y];
}

function pitchColor(p: Pitch): string {
  if (p.isInPlay) return "fill-accent";
  if (p.isStrike) return "fill-amber-400";
  return "fill-good";
}

export default function PitchZonePlot({ pitches }: { pitches: Pitch[] }) {
  const plotted = pitches.filter((p) => p.px !== undefined && p.pz !== undefined);
  const szTop = plotted.find((p) => p.szTop)?.szTop ?? 3.4;
  const szBot = plotted.find((p) => p.szBot)?.szBot ?? 1.6;
  const [zx1, zy1] = toSvg(-0.83, szTop);
  const [zx2, zy2] = toSvg(0.83, szBot);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[190px] w-[150px] shrink-0">
      <rect x={0} y={0} width={W} height={H} rx={10} className="fill-surface-2/50" />
      <rect
        x={zx1}
        y={zy1}
        width={zx2 - zx1}
        height={zy2 - zy1}
        className="fill-none stroke-edge"
        strokeWidth={1.5}
      />
      {/* home plate marker */}
      <path
        d={`M ${W / 2 - 14} ${H - 8} h 28 l -6 6 h -16 z`}
        className="fill-surface-2 stroke-edge"
        strokeWidth={1}
      />
      {plotted.map((p) => {
        const [cx, cy] = toSvg(p.px!, p.pz!);
        return (
          <g key={p.n}>
            <circle cx={cx} cy={cy} r={8} className={pitchColor(p)} />
            <text
              x={cx}
              y={cy + 3.5}
              textAnchor="middle"
              className="fill-background text-[10px] font-bold"
            >
              {p.n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
