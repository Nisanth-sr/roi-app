"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { LoadingButton } from "@/components/LoadingButton";
import { PageLoading } from "@/components/PageLoading";
import {
  EMPTY_PROFILE_FORM,
  TenantProfileFields,
  profileFormFromTenant,
  profileFormToPayload,
  validateProfileForm,
  type ProfileFormState,
} from "@/components/TenantProfileFields";
import { COMPANY_NAME_STORAGE_KEY } from "@/lib/auth/google";
import { createClient } from "@/lib/supabase/client";

type TenantProfileResponse = {
  tenant: {
    name: string;
    payment_gateway: string | null;
    payment_gateway_other: string | null;
    ai_model_ids: string[];
    ai_models_other: string[];
    onboarding_completed_at: string | null;
  };
  role: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [needsTenant, setNeedsTenant] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [profile, setProfile] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
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

      if (!membership?.tenant_id) {
        setNeedsTenant(true);
        setNeedsName(true);
        setChecking(false);
        return;
      }

      const res = await fetch("/api/tenant/settings");
      if (!res.ok) {
        setError("Could not load your workspace. Refresh and try again.");
        setChecking(false);
        return;
      }

      const data = (await res.json()) as TenantProfileResponse;

      if (data.tenant.onboarding_completed_at || data.role !== "owner") {
        sessionStorage.removeItem(COMPANY_NAME_STORAGE_KEY);
        router.replace("/dashboard");
        return;
      }

      setProfile(profileFormFromTenant(data.tenant));
      if (data.tenant.name) {
        setCompanyName(data.tenant.name);
      } else {
        setNeedsName(true);
      }
      setChecking(false);
    }

    checkExisting();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = companyName.trim();
    if (needsName && !name) {
      setError("Company name is required");
      return;
    }

    const profileError = validateProfileForm(profile);
    if (profileError) {
      setError(profileError);
      return;
    }

    setLoading(true);

    if (needsTenant) {
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
    }

    const res = await fetch("/api/tenant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(needsName ? { name } : {}),
        ...profileFormToPayload(profile),
      }),
    });

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Failed to save your workspace profile");
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
    <div className="brand-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="brand-panel w-full max-w-lg p-8">
        <BrandMark href="/" size="sm" />
        <h1 className="mt-6 text-2xl font-semibold text-black">
          Set up your workspace
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Two quick questions so your margin and energy reporting matches how you
          actually operate.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {needsName && (
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
          )}

          <TenantProfileFields
            value={profile}
            onChange={setProfile}
            disabled={loading}
          />

          {error && <p className="text-sm font-medium text-black">{error}</p>}

          <LoadingButton
            type="submit"
            className="w-full"
            loading={loading}
            loadingLabel="Saving…"
          >
            Continue to dashboard
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}
