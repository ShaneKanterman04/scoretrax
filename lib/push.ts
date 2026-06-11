// Server-only web-push sender. Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY and VAPID_SUBJECT (mailto:...) env vars.

import webpush from "web-push";
import { getPushStore, type StoredSub } from "./push-store";

export interface PushPayload {
  title: string;
  body: string;
  gamePk: number;
  tag: string;
}

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@scoretrax.app",
    pub,
    priv
  );
  configured = true;
  return true;
}

// Sends to every sub; prunes subscriptions the push service reports gone.
export async function sendToAll(subs: StoredSub[], payload: PushPayload) {
  if (subs.length === 0 || !ensureConfigured()) return;
  const store = getPushStore();
  const body = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body
        );
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await store.deleteSub(sub.endpoint);
        }
      }
    })
  );
}
