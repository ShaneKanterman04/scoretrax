import type { RecentPlay } from "@/lib/types";

export default function PlaysFeed({ plays }: { plays: RecentPlay[] }) {
  if (plays.length === 0) {
    return <div className="text-xs text-muted">No plays yet.</div>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {plays.map((p) => (
        <li
          key={p.atBatIndex}
          className={`rounded-lg p-2.5 text-xs ${
            p.isScoring ? "bg-surface-2 ring-1 ring-accent/40" : "bg-surface"
          }`}
        >
          <div className="mb-0.5 flex items-center justify-between">
            <span className="font-bold">
              {p.isScoring && <span className="mr-1 text-accent">●</span>}
              {p.event}
            </span>
            <span className="text-[10px] uppercase text-muted">
              {p.half === "top" ? "▲" : "▼"} {p.inning}
              {p.isScoring && (
                <span className="ml-1.5 font-semibold normal-case text-foreground">
                  {p.awayScore}-{p.homeScore}
                </span>
              )}
            </span>
          </div>
          <p className="leading-snug text-muted">{p.description}</p>
        </li>
      ))}
    </ul>
  );
}
