import { NextResponse } from "next/server";
import { requireOwner, isErrorResponse } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const ctx = await requireOwner();
  if (isErrorResponse(ctx)) return ctx;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("user_id, role, created_at")
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: data });
}

export async function POST(request: Request) {
  const ctx = await requireOwner();
  if (isErrorResponse(ctx)) return ctx;

  const body = (await request.json()) as { email?: string; role?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const role = body.role === "owner" ? "owner" : "member";

  try {
    const admin = createAdminClient();
    const { data: listData, error: listError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const user = listData.users.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (!user) {
      return NextResponse.json(
        {
          error:
            "No account found for that email. Ask them to sign up first, then add them again.",
        },
        { status: 404 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.from("tenant_members").insert({
      tenant_id: ctx.tenantId,
      user_id: user.id,
      role,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ userId: user.id, role }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
