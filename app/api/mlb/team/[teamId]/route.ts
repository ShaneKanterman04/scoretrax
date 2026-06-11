import { NextResponse } from "next/server";
import { fetchRoster, fetchTeam, fetchTeamSchedule } from "@/lib/mlb";
import { transformSchedule } from "@/lib/transform";
import { abbrFor } from "@/lib/teams";
import type { ScheduleGame, TeamInfo } from "@/lib/types";

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  try {
    const now = new Date();
    const past = new Date(now.getTime() - 7 * 86400_000);
    const future = new Date(now.getTime() + 7 * 86400_000);
    const [teamRaw, rosterRaw, schedRaw] = await Promise.all([
      fetchTeam(teamId),
      fetchRoster(teamId),
      fetchTeamSchedule(teamId, fmt(past), fmt(future)),
    ]);
    const team = teamRaw.teams?.[0] ?? {};

    const games: ScheduleGame[] = (schedRaw.dates ?? []).flatMap(
      (d: any) => transformSchedule({ dates: [d] }).games
    );
    const today = fmt(now);
    const recent = games.filter((g) => g.state === "Final").slice(-5);
    const upcoming = games
      .filter((g) => g.state !== "Final" && g.officialDate >= today)
      .slice(0, 5);

    const info: TeamInfo = {
      id: team.id,
      name: team.name ?? "",
      abbr: team.abbreviation ?? abbrFor(team.id, team.name),
      record: undefined,
      roster: (rosterRaw.roster ?? []).map((r: any) => ({
        id: r.person?.id,
        name: r.person?.fullName ?? "",
        number: r.jerseyNumber,
        pos: r.position?.abbreviation ?? "",
      })),
      recentGames: recent,
      upcomingGames: upcoming,
    };
    return NextResponse.json(info, {
      headers: { "cache-control": "public, max-age=600" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
