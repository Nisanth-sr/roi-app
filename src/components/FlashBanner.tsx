"use client";

import { useEffect } from "react";

type FlashBannerProps = {
  message: string | null;
  error?: boolean;
  onDismiss?: () => void;
  autoDismissMs?: number;
};

/** Success/error flash with optional checkmark and auto-dismiss. */
export function FlashBanner({
  message,
  error = false,
  onDismiss,
  autoDismissMs = 4000,
}: FlashBannerProps) {
  useEffect(() => {
    if (!message || !onDismiss || autoDismissMs <= 0) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [message, onDismiss, autoDismissMs]);

  if (!message) return null;

  return (
    <p
      role="status"
      className={`flex items-start gap-2 rounded-lg px-4 py-2 text-sm ${
        error
          ? "border border-black bg-[var(--surface)] text-black"
          : "border border-black bg-black text-white"
      }`}
    >
      {!error && (
        <span className="mt-0.5 font-semibold" aria-hidden>
          ✓
        </span>
      )}
      <span className="flex-1">{message}</span>
    </p>
  );
}
