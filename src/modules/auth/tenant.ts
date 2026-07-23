import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function ensureTenantForUser(
  supabase: SupabaseClient,
  userId: string,
  companyName: string
): Promise<{ tenantId: string; created: boolean }> {
  const { data: existing } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.tenant_id) {
    return { tenantId: existing.tenant_id, created: false };
  }

  // Bootstrap must use service role: insert().select() on tenants fails under
  // user JWT because SELECT RLS requires membership that does not exist yet.
  const admin = createAdminClient();

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name: companyName })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message ?? "Failed to create tenant");
  }

  const { error: memberError } = await admin.from("tenant_members").insert({
    tenant_id: tenant.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  return { tenantId: tenant.id, created: true };
}
