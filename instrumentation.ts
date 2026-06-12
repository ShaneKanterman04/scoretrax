// Runs once per server start. On a self-hosted long-running server this
// drives push notifications without any external cron: a sweep every
// PUSH_POLL_SECONDS (default 60) when VAPID keys are configured.
// Set PUSH_POLL_SECONDS=0 to disable (e.g. when using an external cron
// against /api/cron/notify instead). In dev the poller stays off unless
// PUSH_POLL_SECONDS is set explicitly.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const oddsRaw = process.env.ODDS_POLL_SECONDS;
  if (oddsRaw !== "0" && (process.env.NODE_ENV === "production" || oddsRaw)) {
    const seconds = Math.max(60, Number(oddsRaw) || 300);
    const { runOddsHistorySweep } = await import("./lib/odds-history");
    let running = false;
    console.log(`[odds] history poller started (every ${seconds}s)`);
    setInterval(async () => {
      if (running) return;
      running = true;
      try {
        const { matched, sampled } = await runOddsHistorySweep();
        if (sampled > 0) console.log(`[odds] sampled ${matched}/${sampled} pregame markets`);
      } catch (e) {
        console.error("[odds] sweep failed:", e);
      } finally {
        running = false;
      }
    }, seconds * 1000);
  }

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return;
  }
  const raw = process.env.PUSH_POLL_SECONDS;
  if (raw === "0") return;
  if (process.env.NODE_ENV !== "production" && !raw) return;
  const seconds = Math.max(15, Number(raw) || 60);

  const { runNotifySweep } = await import("./lib/notify");
  let running = false;
  console.log(`[push] notification poller started (every ${seconds}s)`);
  setInterval(async () => {
    if (running) return; // skip if the previous sweep is still going
    running = true;
    try {
      const { sent } = await runNotifySweep();
      if (sent > 0) console.log(`[push] sent ${sent} notifications`);
    } catch (e) {
      console.error("[push] sweep failed:", e);
    } finally {
      running = false;
    }
  }, seconds * 1000);
}
