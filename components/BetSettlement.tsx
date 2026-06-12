"use client";

// Headless: mounted in the root layout so open bets settle from final scores
// no matter which page is open. One DateSettler per pending date keeps hook
// counts stable; SWR dedupes the schedule fetch against the Scores and Bets
// pages when they're showing the same date.

import { useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { settleFromSchedule, useBets } from "@/lib/bets";
import { VISIBLE_REFRESH_MS } from "@/lib/refresh";
import type { ScheduleDay } from "@/lib/types";

function DateSettler({ date }: { date: string }) {
  const { data } = useSWR<ScheduleDay>(`/api/mlb/schedule?date=${date}`, fetcher, {
    refreshInterval: VISIBLE_REFRESH_MS,
  });
  useEffect(() => {
    if (data?.games) settleFromSchedule(date, data.games);
  }, [date, data]);
  return null;
}

export default function BetSettlement() {
  const { bets } = useBets();
  const dates = Array.from(
    new Set(
      bets
        .filter((b) => b.status === "open")
        .flatMap((b) => b.legs)
        .filter((l) => l.result === "pending")
        .map((l) => l.officialDate)
    )
  );
  return (
    <>
      {dates.map((date) => (
        <DateSettler key={date} date={date} />
      ))}
    </>
  );
}
