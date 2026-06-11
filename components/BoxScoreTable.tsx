import Link from "next/link";
import type { BoxTeam } from "@/lib/types";

export default function BoxScoreTable({ team }: { team: BoxTeam }) {
  return (
    <div className="rounded-xl bg-surface">
      <div className="border-b border-edge px-3 py-2 text-sm font-bold">{team.name}</div>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-muted">
            <th className="px-3 py-1.5 text-left font-medium">Batters</th>
            <th className="px-1.5 py-1.5 text-right font-medium">AB</th>
            <th className="px-1.5 py-1.5 text-right font-medium">R</th>
            <th className="px-1.5 py-1.5 text-right font-medium">H</th>
            <th className="px-1.5 py-1.5 text-right font-medium">RBI</th>
            <th className="px-1.5 py-1.5 text-right font-medium">BB</th>
            <th className="px-1.5 py-1.5 text-right font-medium">K</th>
            <th className="px-2 py-1.5 text-right font-medium">AVG</th>
          </tr>
        </thead>
        <tbody>
          {team.batters.map((b) => {
            const isSub = b.order !== undefined && b.order % 100 !== 0;
            return (
              <tr key={b.id} className="border-t border-edge/60">
                <td className={`px-3 py-1.5 ${isSub ? "pl-6" : ""}`}>
                  <Link href={`/player/${b.id}`} className="font-medium">
                    {b.name}
                  </Link>{" "}
                  <span className="text-muted">{b.pos}</span>
                </td>
                <td className="px-1.5 py-1.5 text-right">{b.ab}</td>
                <td className="px-1.5 py-1.5 text-right">{b.r}</td>
                <td className="px-1.5 py-1.5 text-right">{b.h}</td>
                <td className="px-1.5 py-1.5 text-right">{b.rbi}</td>
                <td className="px-1.5 py-1.5 text-right">{b.bb}</td>
                <td className="px-1.5 py-1.5 text-right">{b.k}</td>
                <td className="px-2 py-1.5 text-right text-muted">{b.avg}</td>
              </tr>
            );
          })}
        </tbody>
        <thead>
          <tr className="border-t border-edge text-muted">
            <th className="px-3 py-1.5 text-left font-medium">Pitchers</th>
            <th className="px-1.5 py-1.5 text-right font-medium">IP</th>
            <th className="px-1.5 py-1.5 text-right font-medium">H</th>
            <th className="px-1.5 py-1.5 text-right font-medium">R</th>
            <th className="px-1.5 py-1.5 text-right font-medium">ER</th>
            <th className="px-1.5 py-1.5 text-right font-medium">BB</th>
            <th className="px-1.5 py-1.5 text-right font-medium">K</th>
            <th className="px-2 py-1.5 text-right font-medium">P</th>
          </tr>
        </thead>
        <tbody>
          {team.pitchers.map((p) => (
            <tr key={p.id} className="border-t border-edge/60">
              <td className="px-3 py-1.5">
                <Link href={`/player/${p.id}`} className="font-medium">
                  {p.name}
                </Link>{" "}
                {p.note && <span className="text-muted">{p.note}</span>}
              </td>
              <td className="px-1.5 py-1.5 text-right">{p.ip}</td>
              <td className="px-1.5 py-1.5 text-right">{p.h}</td>
              <td className="px-1.5 py-1.5 text-right">{p.r}</td>
              <td className="px-1.5 py-1.5 text-right">{p.er}</td>
              <td className="px-1.5 py-1.5 text-right">{p.bb}</td>
              <td className="px-1.5 py-1.5 text-right">{p.k}</td>
              <td className="px-2 py-1.5 text-right text-muted">{p.pitches ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
