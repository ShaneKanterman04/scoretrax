"use client";

import Link from "next/link";
import { TEAMS } from "@/lib/teams";
import { useFavorites } from "@/lib/favorites";
import FavoriteStar from "@/components/FavoriteStar";
import NotificationToggle from "@/components/NotificationToggle";

export default function TeamsPage() {
  const { isFavorite } = useFavorites();
  const sorted = [...TEAMS].sort(
    (a, b) =>
      Number(isFavorite(b.id)) - Number(isFavorite(a.id)) ||
      a.name.localeCompare(b.name)
  );
  return (
    <main className="px-4 pt-3">
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-bold">Teams</h1>
        <NotificationToggle />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sorted.map((t) => (
          <Link
            key={t.id}
            href={`/team/${t.id}`}
            className="flex min-h-16 items-center justify-between rounded-xl bg-surface p-3 active:bg-surface-2"
          >
            <span className="flex flex-col justify-center">
              <span className="text-sm font-bold">{t.abbr}</span>
              <span className="text-xs leading-tight text-muted">{t.name}</span>
            </span>
            <FavoriteStar teamId={t.id} />
          </Link>
        ))}
      </div>
    </main>
  );
}
