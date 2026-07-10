import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/modules/auth/tenant";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { companyName?: string };
  const companyName = body.companyName?.trim() || "My Company";

  try {
    const result = await ensureTenantForUser(supabase, user.id, companyName);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
