import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: history, error: historyError } = await supabase
    .from("monthly_client_summary")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("client_id", id)
    .order("month", { ascending: true });

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  return NextResponse.json({ client, history: history ?? [] });
}
