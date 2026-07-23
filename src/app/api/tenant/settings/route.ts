import { NextResponse } from "next/server";
import { getAuthContext, requireOwner, isErrorResponse } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    tenant: {
      id: ctx.tenant.id,
      name: ctx.tenant.name,
      red_flag_threshold: Number(ctx.tenant.red_flag_threshold),
    },
    role: ctx.role,
  });
}

export async function PATCH(request: Request) {
  const ctx = await requireOwner();
  if (isErrorResponse(ctx)) return ctx;

  const body = (await request.json()) as {
    red_flag_threshold?: number;
    name?: string;
  };

  const updates: Record<string, unknown> = {};

  if (body.red_flag_threshold !== undefined) {
    const threshold = Number(body.red_flag_threshold);
    if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
      return NextResponse.json(
        { error: "red_flag_threshold must be between 0 and 100" },
        { status: 400 }
      );
    }
    updates.red_flag_threshold = threshold;
  }

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    updates.name = name;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .update(updates)
    .eq("id", ctx.tenantId)
    .select("id, name, red_flag_threshold")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tenant: data });
}
