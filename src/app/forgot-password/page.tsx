"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { LoadingButton } from "@/components/LoadingButton";
import { PageLoading } from "@/components/PageLoading";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const prefill = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    // Neutral copy — do not reveal whether the email exists
    setSent(true);
  }

  return (
    <div className="brand-panel w-full max-w-md p-8">
      <BrandMark href="/" size="sm" />
      <h1 className="mt-6 text-2xl font-semibold text-black">
        Forgot password
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Enter your account email and we will send a reset link if it exists.
      </p>

      {sent ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-lg border border-black bg-black px-4 py-3 text-sm text-white">
            If an account exists for that email, we sent a reset link. Check your
            inbox and spam folder.
          </p>
          <p className="text-center text-sm text-[var(--muted)]">
            <Link href="/login" className="font-medium text-black underline">
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-black">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="brand-input"
              autoComplete="email"
            />
          </div>
          {error && <p className="text-sm font-medium text-black">{error}</p>}
          <LoadingButton
            type="submit"
            className="w-full"
            loading={loading}
            loadingLabel="Sending…"
          >
            Send reset link
          </LoadingButton>
          <p className="text-center text-sm text-[var(--muted)]">
            <Link href="/login" className="font-medium text-black underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="brand-shell flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md">
            <PageLoading label="Loading…" />
          </div>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
