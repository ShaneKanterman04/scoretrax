import type { WinProbPoint } from "@/lib/types";

// Win probability over the game, from the home team's perspective: the line
// above the dashed midline means the home team is favored.
const W = 320;
const H = 120;
const PAD_X = 6;
const PAD_TOP = 6;
const PAD_BOT = 16;

export default function WinProbChart({
  points,
  awayAbbr,
  homeAbbr,
}: {
  points: WinProbPoint[];
  awayAbbr: string;
  homeAbbr: string;
}) {
  if (points.length < 2) return null;

  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_TOP - PAD_BOT;
  const toX = (i: number) => PAD_X + (i / (points.length - 1)) * plotW;
  const toY = (wp: number) => PAD_TOP + (1 - wp / 100) * plotH;

  const path = points.map((p, i) => `${toX(i)},${toY(p.homeWP)}`).join(" ");
  const midY = toY(50);

  // tick at the first play of each inning
  const innings: { i: number; inning: number }[] = [];
  points.forEach((p, i) => {
    if (i === 0 || p.inning !== points[i - 1].inning) {
      innings.push({ i, inning: p.inning });
    }
  });

  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <rect x={0} y={0} width={W} height={H} rx={10} className="fill-surface-2/50" />

      {innings.map(({ i, inning }) => (
        <g key={inning}>
          <line
            x1={toX(i)}
            y1={PAD_TOP}
            x2={toX(i)}
            y2={PAD_TOP + plotH}
            className="stroke-edge/60"
            strokeWidth={1}
          />
          <text
            x={toX(i) + 3}
            y={H - 5}
            className="fill-muted text-[8px] tabular-nums"
          >
            {inning}
          </text>
        </g>
      ))}

      <line
        x1={PAD_X}
        y1={midY}
        x2={W - PAD_X}
        y2={midY}
        className="stroke-edge"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text x={PAD_X + 2} y={PAD_TOP + 8} className="fill-muted text-[9px] font-bold">
        {homeAbbr}
      </text>
      <text x={PAD_X + 2} y={PAD_TOP + plotH - 2} className="fill-muted text-[9px] font-bold">
        {awayAbbr}
      </text>

      <polyline
        points={path}
        className="fill-none stroke-accent"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />

      {points.map(
        (p, i) =>
          p.isScoring && (
            <circle
              key={p.atBatIndex}
              cx={toX(i)}
              cy={toY(p.homeWP)}
              r={3}
              className="fill-accent stroke-background"
              strokeWidth={1}
            />
          )
      )}

      <text
        x={Math.min(toX(points.length - 1), W - 4)}
        y={toY(last.homeWP) + (last.homeWP > 50 ? 12 : -6)}
        textAnchor="end"
        className="fill-foreground text-[10px] font-bold tabular-nums"
      >
        {last.homeWP >= 50 ? homeAbbr : awayAbbr}{" "}
        {Math.round(last.homeWP >= 50 ? last.homeWP : 100 - last.homeWP)}%
      </text>
    </svg>
  );
}
