import { DashboardNav } from "@/components/DashboardNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, tenants(onboarding_completed_at)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.tenant_id) redirect("/onboarding");

  // Only owners can save the profile, so members are never bounced
  const tenant = membership.tenants as unknown as {
    onboarding_completed_at: string | null;
  } | null;

  if (membership.role === "owner" && !tenant?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  return (
    <div className="brand-shell min-h-screen bg-[var(--surface)]">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
