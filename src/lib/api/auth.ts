import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Tenant, TenantMember } from "@/lib/types";

export type AuthContext = {
  userId: string;
  tenantId: string;
  role: TenantMember["role"];
  tenant: Tenant;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, tenants(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.tenants) return null;

  const tenant = membership.tenants as unknown as Tenant;

  return {
    userId: user.id,
    tenantId: membership.tenant_id,
    role: membership.role as TenantMember["role"],
    tenant,
  };
}

export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return ctx;
}

export async function requireOwner(): Promise<AuthContext | NextResponse> {
  const ctx = await requireAuth();
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return ctx;
}

export function isErrorResponse(
  value: AuthContext | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}
