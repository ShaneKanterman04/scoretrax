"use client";

import { useEffect, useState } from "react";
import { getFavoriteIds, onFavoritesChange } from "@/lib/favorites";

// Bell toggle for game-event push alerts on favorited teams. Hidden when the
// browser doesn't support push (or no VAPID key is configured). On iOS this
// only works from the installed PWA (16.4+).

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function postSubscription(sub: PushSubscription) {
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), teamIds: getFavoriteIds() }),
  });
}

export default function NotificationToggle() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    setSupported(true);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {});
  }, [vapidKey]);

  // keep the server's teamIds in sync when favorites change while subscribed
  useEffect(() => {
    if (!enabled) return;
    return onFavoritesChange(() => {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => sub && postSubscription(sub))
        .catch(() => {});
    });
  }, [enabled]);

  if (!supported) return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        setEnabled(false);
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!) as BufferSource,
      });
      await postSubscription(sub);
      setEnabled(true);
    } catch {
      // subscribe can fail on unsupported browsers / blocked permission
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? "Disable game alerts" : "Enable game alerts"}
      aria-pressed={enabled}
      className={`-m-2 p-2 ${enabled ? "text-accent" : "text-muted"}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill={enabled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    </button>
  );
}
