import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioSummary } from "@/lib/types";

export async function GET(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month =
    searchParams.get("month") ?? new Date().toISOString().slice(0, 7) + "-01";

  const supabase = await createClient();

  const { data: summaries, error } = await supabase
    .from("monthly_client_summary")
    .select("*, clients(name, external_ref)")
    .eq("tenant_id", ctx.tenantId)
    .eq("month", month);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (summaries ?? []).map((s) => ({
    ...s,
    client_name: (s.clients as { name: string } | null)?.name ?? "Unknown",
    external_ref:
      (s.clients as { external_ref: string | null } | null)?.external_ref ?? null,
  }));

  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.total_revenue), 0);
  const totalCost = rows.reduce((sum, r) => sum + Number(r.total_cost), 0);
  const blendedMargin = totalRevenue - totalCost;
  const blendedMarginPercent =
    totalRevenue > 0 ? (blendedMargin / totalRevenue) * 100 : null;
  const totalEnergyWh = rows.reduce(
    (sum, r) => sum + Number(r.total_energy_wh ?? 0),
    0
  );
  const requestCount = rows.reduce(
    (sum, r) => sum + Number(r.request_count ?? 0),
    0
  );
  const energyWhPerRequest =
    requestCount > 0 ? totalEnergyWh / requestCount : null;

  const portfolio: PortfolioSummary = {
    month,
    total_revenue: Math.round(totalRevenue * 1e4) / 1e4,
    total_cost: Math.round(totalCost * 1e4) / 1e4,
    blended_margin: Math.round(blendedMargin * 1e4) / 1e4,
    blended_margin_percent:
      blendedMarginPercent !== null
        ? Math.round(blendedMarginPercent * 1e4) / 1e4
        : null,
    client_count: rows.length,
    red_flag_count: rows.filter((r) => r.red_flag).length,
    total_energy_wh: Math.round(totalEnergyWh * 1e6) / 1e6,
    request_count: requestCount,
    energy_wh_per_request:
      energyWhPerRequest !== null
        ? Math.round(energyWhPerRequest * 1e10) / 1e10
        : null,
  };

  const clientsSorted = [...rows].sort((a, b) => {
    const aPct = a.margin_percent ?? -Infinity;
    const bPct = b.margin_percent ?? -Infinity;
    return aPct - bPct;
  });

  return NextResponse.json({ portfolio, clients: clientsSorted });
}
