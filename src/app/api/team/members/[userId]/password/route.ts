import { NextResponse } from "next/server";
import { requireOwner, isErrorResponse } from "@/lib/api/auth";
import {
  createAdminClient,
  SERVICE_ROLE_MISSING_MESSAGE,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 8;

type RouteParams = { params: Promise<{ userId: string }> };

/**
 * Owner sets / replaces a password for an existing Auth user in this workspace.
 * Supabase Dashboard often cannot edit passwords on existing users; this uses
 * the Admin API so the hash is stored in auth.users (no app DB column needed).
 */
export async function POST(request: Request, { params }: RouteParams) {
  const ctx = await requireOwner();
  if (isErrorResponse(ctx)) return ctx;

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const body = (await request.json()) as { password?: string };
  const password = body.password ?? "";

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", ctx.tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 }
    );
  }
  if (!membership) {
    return NextResponse.json(
      { error: "That user is not a member of this workspace." },
      { status: 404 }
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: SERVICE_ROLE_MISSING_MESSAGE },
      { status: 503 }
    );
  }

  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to set password" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    userId: data.user?.id ?? userId,
    message: "Password set. They can sign in with email and this password.",
  });
}
