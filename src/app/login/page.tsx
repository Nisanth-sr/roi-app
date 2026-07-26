"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { LoadingButton } from "@/components/LoadingButton";
import { PageLoading } from "@/components/PageLoading";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const resetOk = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    oauthError ? decodeURIComponent(oauthError) : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="brand-panel w-full max-w-md p-8">
      <BrandMark href="/" size="sm" />
      <h1 className="mt-6 text-2xl font-semibold text-black">Sign in</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Access your per-client margin dashboard.
      </p>

      <div className="mt-6">
        <GoogleAuthButton label="Continue with Google" />
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
          or
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-black">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="brand-input"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-black">
              Password
            </label>
            <Link
              href={
                email.trim()
                  ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                  : "/forgot-password"
              }
              className="text-sm font-medium text-black underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="brand-input"
          />
        </div>
        {resetOk && !error && (
          <p className="rounded-lg border border-black bg-black px-3 py-2 text-sm text-white">
            Password updated. Sign in with your new password.
          </p>
        )}
        {error && <p className="text-sm font-medium text-black">{error}</p>}
        <LoadingButton
          type="submit"
          className="w-full"
          loading={loading}
          loadingLabel="Signing in…"
        >
          Sign in
        </LoadingButton>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        No account?{" "}
        <Link href="/signup" className="font-medium text-black underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="brand-shell flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md">
            <PageLoading label="Loading…" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
