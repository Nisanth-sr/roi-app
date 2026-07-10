import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("upload_batches")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("uploaded_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ batches: data });
}
