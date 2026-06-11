"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function HelpModal({
  title,
  children,
  triggerLabel = "Help",
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  triggerLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted transition-colors active:bg-surface-2 ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.7 9a2.3 2.3 0 0 1 4.4 1c0 1.6-2.1 1.9-2.1 3.4" />
          <path d="M12 17h.01" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 px-4 pb-4 pt-safe backdrop-blur-sm sm:items-center sm:pb-0"
          onMouseDown={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-xl border border-edge bg-surface p-4 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-base font-bold">
                {title}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close help"
                className="-m-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted active:bg-surface-2"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
