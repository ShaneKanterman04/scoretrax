"use client";

import { usePinnedGames } from "@/lib/favorites";

// Pin toggle for a single game. Safe inside a <Link>: stops the click from
// navigating.
export default function GameStar({
  gamePk,
  officialDate,
}: {
  gamePk: number;
  officialDate: string;
}) {
  const { isPinned, toggle } = usePinnedGames();
  const pinned = isPinned(gamePk);
  return (
    <button
      type="button"
      aria-label={pinned ? "Unpin game" : "Pin game to top"}
      aria-pressed={pinned}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(gamePk, officialDate);
      }}
      className={`-m-1.5 self-start p-1.5 ${pinned ? "text-accent" : "text-muted/60"}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={pinned ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      >
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
    </button>
  );
}
