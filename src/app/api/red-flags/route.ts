import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month =
    searchParams.get("month") ?? new Date().toISOString().slice(0, 7) + "-01";

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("monthly_client_summary")
    .select("*, clients(name, external_ref)")
    .eq("tenant_id", ctx.tenantId)
    .eq("month", month)
    .eq("red_flag", true)
    .order("margin_percent", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((s) => ({
    ...s,
    client_name: (s.clients as { name: string } | null)?.name ?? "Unknown",
    external_ref:
      (s.clients as { external_ref: string | null } | null)?.external_ref ?? null,
  }));

  return NextResponse.json({ redFlags: rows });
}
