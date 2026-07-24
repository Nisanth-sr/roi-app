"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { LoadingButton } from "@/components/LoadingButton";
import { PageLoading } from "@/components/PageLoading";
import { COMPANY_NAME_STORAGE_KEY } from "@/lib/auth/google";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(COMPANY_NAME_STORAGE_KEY);
    if (stored) setCompanyName(stored);

    async function checkExisting() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: membership } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (membership?.tenant_id) {
        sessionStorage.removeItem(COMPANY_NAME_STORAGE_KEY);
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    }

    checkExisting();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const name = companyName.trim();
    if (!name) {
      setError("Company name is required");
      setLoading(false);
      return;
    }

    const setup = await fetch("/api/auth/setup-tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: name }),
    });

    if (!setup.ok) {
      const body = (await setup.json()) as { error?: string };
      setError(body.error ?? "Failed to set up workspace");
      setLoading(false);
      return;
    }

    sessionStorage.removeItem(COMPANY_NAME_STORAGE_KEY);
    router.push("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="brand-shell flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <PageLoading label="Preparing your workspace…" />
        </div>
      </div>
    );
  }

  return (
    <div className="brand-shell flex min-h-screen items-center justify-center px-4">
      <div className="brand-panel w-full max-w-md p-8">
        <BrandMark href="/" size="sm" />
        <h1 className="mt-6 text-2xl font-semibold text-black">
          Name your workspace
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          One more step — tell us your company name so we can set up your tenant.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              autoFocus
            />
          </div>
          {error && <p className="text-sm font-medium text-black">{error}</p>}
          <LoadingButton
            type="submit"
            className="w-full"
            loading={loading}
            loadingLabel="Creating…"
          >
            Continue to dashboard
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}
