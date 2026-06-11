import type { Bases } from "@/lib/types";

// SVG base diamond: three squares rotated 45deg; filled = occupied.
export default function BasesDiamond({
  bases,
  size = 64,
  showNames,
}: {
  bases?: Bases;
  size?: number;
  showNames?: boolean;
}) {
  const b = bases ?? { first: false, second: false, third: false };
  const base = (cx: number, cy: number, occupied: boolean, key: string) => (
    <rect
      key={key}
      x={cx - 9}
      y={cy - 9}
      width={18}
      height={18}
      rx={2.5}
      transform={`rotate(45 ${cx} ${cy})`}
      className={occupied ? "fill-amber-400" : "fill-surface-2 stroke-edge"}
      strokeWidth={1.5}
    />
  );
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg viewBox="0 0 100 64" width={size} height={(size * 64) / 100}>
        {base(50, 18, b.second, "2b")}
        {base(20, 46, b.third, "3b")}
        {base(80, 46, b.first, "1b")}
      </svg>
      {showNames && (b.first || b.second || b.third) && (
        <div className="text-center text-[10px] leading-tight text-muted">
          {b.second && b.runnerNames?.second && <div>2B {b.runnerNames.second}</div>}
          {b.third && b.runnerNames?.third && <div>3B {b.runnerNames.third}</div>}
          {b.first && b.runnerNames?.first && <div>1B {b.runnerNames.first}</div>}
        </div>
      )}
    </div>
  );
}
