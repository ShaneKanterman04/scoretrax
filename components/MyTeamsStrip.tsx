"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import { teamById } from "@/lib/teams";

// Quick-access chips for favorited teams. Renders nothing when there are none.
export default function MyTeamsStrip() {
  const { ids } = useFavorites();
  const teams = ids
    .map((id) => teamById(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .sort((a, b) => a.abbr.localeCompare(b.abbr));
  if (teams.length === 0) return null;
  return (
    <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
      {teams.map((t) => (
        <Link
          key={t.id}
          href={`/team/${t.id}`}
          className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-xs font-bold active:bg-surface-2"
        >
          {t.abbr}
        </Link>
      ))}
    </div>
  );
}
