import type { Pitch } from "@/lib/types";

function dotColor(p: Pitch): string {
  if (p.isInPlay) return "bg-accent";
  if (p.isStrike) return "bg-amber-400";
  return "bg-good";
}

export default function PitchList({ pitches }: { pitches: Pitch[] }) {
  if (pitches.length === 0) {
    return <div className="text-xs text-muted">No pitches yet this at-bat.</div>;
  }
  return (
    <ol className="flex w-full flex-col gap-1.5">
      {[...pitches].reverse().map((p) => (
        <li key={p.n} className="flex items-center gap-2 text-xs">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-background ${dotColor(p)}`}
          >
            {p.n}
          </span>
          <span className="font-semibold tabular-nums">
            {p.mph !== undefined ? `${p.mph.toFixed(1)}` : "—"}
          </span>
          <span className="text-muted">{p.typeCode ?? ""}</span>
          <span className="min-w-0 flex-1 truncate text-right text-muted">{p.callDesc}</span>
        </li>
      ))}
    </ol>
  );
}
