# ScoreTrax

Mobile-first PWA for following live MLB games: scores, live at-bats with pitch plots, win probability, box scores, standings with the playoff race, team/player pages, and Polymarket win odds. Built with Next.js (App Router), React, Tailwind, and SWR over the public MLB Stats API — no database required for the core app.

## Features

- **Scores** — date-navigable game list with live updates; star teams and pin individual games to keep them on top
- **Live game view** — bases/count, pitch-by-pitch strike zone plot, batter vs. pitcher career head-to-head with hot/cold zones, win probability chart, animated event flashes (hit/run/out/strike/ball), box score, and full play-by-play
- **Standings** — divisions plus the wild card race with WCGB, elimination numbers, and clinch badges
- **Push notifications** — game start / lead change / final alerts for your favorite teams (see setup below)

## Self-hosting

```bash
npm install
npm run build
npm start          # long-running server, e.g. behind nginx/caddy + systemd
```

Web push requires a secure context, so serve the app over HTTPS (a reverse proxy with a Let's Encrypt cert is the usual setup).

### Push notifications

1. Generate keys: `npx web-push generate-vapid-keys`, then set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` per `.env.example` (note: the public key is inlined at build time, so rebuild after changing it).
2. That's it — with keys present, the server polls the MLB schedule every 60 s in-process (`instrumentation.ts`) and notifies subscribers on game start, lead changes, and finals. Tune with `PUSH_POLL_SECONDS`, or set it to `0` and hit `GET /api/cron/notify` with `Authorization: Bearer <CRON_SECRET>` from an external cron instead.
3. Subscriptions persist in a JSON file (`.push-store.json` next to the app by default; override with `PUSH_STORE_FILE`). Setting `UPSTASH_REDIS_REST_URL`/`TOKEN` switches to Upstash Redis for serverless or multi-instance deployments.
4. iOS requires the installed PWA (Add to Home Screen, iOS 16.4+) for web push; enable alerts via the bell on the Teams page.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
