import { NextResponse } from "next/server";
import { getAuthContext, requireOwner, isErrorResponse } from "@/lib/api/auth";
import {
  createAdminClient,
  SERVICE_ROLE_MISSING_MESSAGE,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  const maxPages = 25;

  while (page <= maxPages) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("user_id, role, created_at")
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const members = data ?? [];
  const emailById = new Map<string, string | null>();

  try {
    const admin = createAdminClient();
    await Promise.all(
      members.map(async (m) => {
        const { data: userData } = await admin.auth.admin.getUserById(m.user_id);
        emailById.set(m.user_id, userData.user?.email ?? null);
      })
    );
  } catch {
    // Service role missing in some local setups — still return members without email
  }

  return NextResponse.json({
    members: members.map((m) => ({
      ...m,
      email: emailById.get(m.user_id) ?? null,
    })),
  });
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

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING_MESSAGE }, { status: 503 });
  }

  try {
    let user = await findAuthUserByEmail(admin, email);
    let invited = false;

    if (!user) {
      const { data: invitedData, error: inviteError } =
        await admin.auth.admin.inviteUserByEmail(email);

      if (inviteError) {
        return NextResponse.json(
          { error: inviteError.message || "Failed to invite user" },
          { status: 500 }
        );
      }

      user = invitedData.user;
      invited = true;

      if (!user) {
        return NextResponse.json(
          { error: "Invite succeeded but no user was returned" },
          { status: 500 }
        );
      }
    }

    const supabase = await createClient();
    const { error } = await supabase.from("tenant_members").insert({
      tenant_id: ctx.tenantId,
      user_id: user.id,
      role,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That user is already a member of this workspace." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        userId: user.id,
        role,
        invited,
        message: invited
          ? "Invite sent. They will appear once they accept."
          : "Member added.",
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invite failed";
    if (message.includes("Missing Supabase admin credentials")) {
      return NextResponse.json(
        { error: SERVICE_ROLE_MISSING_MESSAGE },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
