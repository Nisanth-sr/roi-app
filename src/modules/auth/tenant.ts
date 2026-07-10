import type { SupabaseClient } from "@supabase/supabase-js";

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

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: companyName })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    throw tenantError ?? new Error("Failed to create tenant");
  }

  const { error: memberError } = await supabase.from("tenant_members").insert({
    tenant_id: tenant.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) throw memberError;

  return { tenantId: tenant.id, created: true };
}
