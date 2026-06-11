"use client";

import { shiftDate, todayLocal } from "@/lib/fetcher";

function label(date: string): string {
  const today = todayLocal();
  if (date === today) return "Today";
  if (date === shiftDate(today, -1)) return "Yesterday";
  if (date === shiftDate(today, 1)) return "Tomorrow";
  return new Date(`${date}T12:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DateNav({
  date,
  onChange,
}: {
  date: string;
  onChange: (date: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        aria-label="Previous day"
        onClick={() => onChange(shiftDate(date, -1))}
        className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-muted active:bg-surface"
      >
        ‹
      </button>
      <label className="relative flex h-11 items-center justify-center px-4 text-base font-bold">
        {label(date)}
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 opacity-0"
        />
      </label>
      <button
        aria-label="Next day"
        onClick={() => onChange(shiftDate(date, 1))}
        className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-muted active:bg-surface"
      >
        ›
      </button>
    </div>
  );
}
