/**
 * RLS integration tests — require Supabase credentials.
 * Run: SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:rls
 *
 * These tests create two tenants and verify cross-tenant reads fail.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

/** CI and local builds often set placeholder env vars so Next can compile. */
function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return /placeholder/i.test(value);
}

const rlsEnabled =
  Boolean(url && serviceKey && anonKey) &&
  !isPlaceholder(url) &&
  !isPlaceholder(serviceKey) &&
  !isPlaceholder(anonKey);

describe.skipIf(!rlsEnabled)("RLS cross-tenant isolation", () => {
  it("tenant A cannot read tenant B clients", async () => {
    const admin = createClient(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const emailA = `rls-a-${Date.now()}@test.local`;
    const emailB = `rls-b-${Date.now()}@test.local`;
    const password = "test-password-12345";

    const { data: userA } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    });
    const { data: userB } = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    });

    expect(userA.user).toBeTruthy();
    expect(userB.user).toBeTruthy();

    const { data: tenantA } = await admin
      .from("tenants")
      .insert({ name: "Tenant A" })
      .select()
      .single();

    const { data: tenantB } = await admin
      .from("tenants")
      .insert({ name: "Tenant B" })
      .select()
      .single();

    await admin.from("tenant_members").insert([
      { tenant_id: tenantA!.id, user_id: userA.user!.id, role: "owner" },
      { tenant_id: tenantB!.id, user_id: userB.user!.id, role: "owner" },
    ]);

    const { data: clientB } = await admin
      .from("clients")
      .insert({
        tenant_id: tenantB!.id,
        name: "Secret Client B",
        external_ref: "secret-b",
      })
      .select()
      .single();

    const userClient = createClient(url!, anonKey!);
    const { data: session } = await userClient.auth.signInWithPassword({
      email: emailA,
      password,
    });
    expect(session.session).toBeTruthy();

    const authedClient = createClient(url!, anonKey!, {
      global: {
        headers: { Authorization: `Bearer ${session.session!.access_token}` },
      },
    });

    const { data: leaked } = await authedClient
      .from("clients")
      .select("*")
      .eq("id", clientB!.id);

    expect(leaked).toEqual([]);

    // Cleanup
    await admin.from("clients").delete().eq("id", clientB!.id);
    await admin.from("tenant_members").delete().eq("user_id", userA.user!.id);
    await admin.from("tenant_members").delete().eq("user_id", userB.user!.id);
    await admin.from("tenants").delete().eq("id", tenantA!.id);
    await admin.from("tenants").delete().eq("id", tenantB!.id);
    await admin.auth.admin.deleteUser(userA.user!.id);
    await admin.auth.admin.deleteUser(userB.user!.id);
  });
});
