"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { LoadingButton } from "@/components/LoadingButton";
import { PageLoading } from "@/components/PageLoading";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setHasSession(Boolean(user));
      setChecking(false);
    }
    checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?reset=1");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="brand-shell flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <PageLoading label="Checking reset link…" />
        </div>
      </div>
    );
  }

  return (
    <div className="brand-shell flex min-h-screen items-center justify-center px-4">
      <div className="brand-panel w-full max-w-md p-8">
        <BrandMark href="/" size="sm" />
        <h1 className="mt-6 text-2xl font-semibold text-black">
          Set new password
        </h1>

        {!hasSession ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-[var(--muted)]">
              This reset link is invalid or has expired. Request a new one and
              open it from your email.
            </p>
            <Link href="/forgot-password" className="brand-btn inline-flex">
              Request new link
            </Link>
            <p className="text-sm text-[var(--muted)]">
              <Link href="/login" className="font-medium text-black underline">
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Choose a new password for your account.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-black">
                  New password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="brand-input"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="brand-input"
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <p className="text-sm font-medium text-black">{error}</p>
              )}
              <LoadingButton
                type="submit"
                className="w-full"
                loading={loading}
                loadingLabel="Saving…"
              >
                Update password
              </LoadingButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
