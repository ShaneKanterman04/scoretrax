import type { LiveGame } from "@/lib/types";

export default function LineScore({
  linescore,
  awayAbbr,
  homeAbbr,
}: {
  linescore: LiveGame["linescore"];
  awayAbbr: string;
  homeAbbr: string;
}) {
  const innings = linescore.innings;
  const count = Math.max(innings.length, 9);
  const cols = Array.from({ length: count }, (_, i) => innings[i]);
  const { rhe } = linescore;
  return (
    <div className="overflow-x-auto rounded-xl bg-surface">
      <table className="w-full min-w-max text-center text-xs tabular-nums">
        <thead>
          <tr className="text-muted">
            <th className="sticky left-0 bg-surface px-3 py-2 text-left"></th>
            {cols.map((_, i) => (
              <th key={i} className="px-2 py-2 font-medium">
                {i + 1}
              </th>
            ))}
            <th className="border-l border-edge px-2 py-2 font-bold">R</th>
            <th className="px-2 py-2 font-bold">H</th>
            <th className="px-2 py-2 font-bold">E</th>
          </tr>
        </thead>
        <tbody>
          {(["away", "home"] as const).map((side) => (
            <tr key={side} className="border-t border-edge">
              <td className="sticky left-0 bg-surface px-3 py-2 text-left font-bold">
                {side === "away" ? awayAbbr : homeAbbr}
              </td>
              {cols.map((inn, i) => (
                <td key={i} className="px-2 py-2">
                  {inn?.[side] ?? "-"}
                </td>
              ))}
              <td className="border-l border-edge px-2 py-2 font-bold">
                {rhe[side][0]}
              </td>
              <td className="px-2 py-2">{rhe[side][1]}</td>
              <td className="px-2 py-2">{rhe[side][2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
