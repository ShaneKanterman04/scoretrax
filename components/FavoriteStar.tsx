"use client";

import { useFavorites } from "@/lib/favorites";

// Star toggle for a team. Safe to place inside a <Link>: it stops the
// click from navigating.
export default function FavoriteStar({
  teamId,
  className = "h-5 w-5",
}: {
  teamId: number;
  className?: string;
}) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(teamId);
  return (
    <button
      type="button"
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={fav}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(teamId);
      }}
      className={`-m-2 p-2 ${fav ? "text-accent" : "text-muted"}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill={fav ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      >
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
    </button>
  );
}
