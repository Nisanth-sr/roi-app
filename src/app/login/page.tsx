"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { LoadingButton } from "@/components/LoadingButton";
import { Spinner } from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
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
          <label className="block text-sm font-medium text-black">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="brand-input"
          />
        </div>
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
          <div className="brand-panel flex w-full max-w-md items-center justify-center gap-2 p-8 text-sm text-[var(--muted)]">
            <Spinner />
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
