"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth/google";

type GoogleAuthButtonProps = {
  label?: string;
  disabled?: boolean;
  onBeforeStart?: () => string | null;
  next?: string;
};

export function GoogleAuthButton({
  label = "Continue with Google",
  disabled = false,
  onBeforeStart,
  next,
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    if (onBeforeStart) {
      const validationError = onBeforeStart();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);
    const { error: oauthError } = await signInWithGoogle({ next });
    if (oauthError) {
      setError(oauthError);
      setLoading(false);
    }
    // On success, browser redirects to Google — keep loading state
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className="brand-btn-ghost flex w-full items-center justify-center gap-2"
      >
        <GoogleIcon />
        {loading ? "Redirecting…" : label}
      </button>
      {error && <p className="text-center text-sm font-medium text-black">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#000"
        d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.1-2.7-.5-4z"
      />
    </svg>
  );
}
