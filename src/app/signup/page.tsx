"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import {
  COMPANY_NAME_STORAGE_KEY,
} from "@/lib/auth/google";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!companyName.trim()) {
      setError("Company name is required");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Signup failed");
      setLoading(false);
      return;
    }

    const setup = await fetch("/api/auth/setup-tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName }),
    });

    if (!setup.ok) {
      const body = (await setup.json()) as { error?: string };
      setError(body.error ?? "Failed to set up workspace");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function beforeGoogle() {
    const name = companyName.trim();
    if (!name) {
      return "Enter your company name before continuing with Google.";
    }
    sessionStorage.setItem(COMPANY_NAME_STORAGE_KEY, name);
    return null;
  }

  return (
    <div className="brand-shell flex min-h-screen items-center justify-center px-4">
      <div className="brand-panel w-full max-w-md p-8">
        <BrandMark href="/" size="sm" />
        <h1 className="mt-6 text-2xl font-semibold text-black">Create account</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Start tracking per-client AI margins.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-black">
              Company name
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="brand-input"
              placeholder="Acme AI"
            />
          </div>
          <GoogleAuthButton
            label="Continue with Google"
            onBeforeStart={beforeGoogle}
          />
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
            <label className="block text-sm font-medium text-black">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="brand-input"
            />
          </div>
          {error && <p className="text-sm font-medium text-black">{error}</p>}
          <button type="submit" disabled={loading} className="brand-btn w-full">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-black underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
