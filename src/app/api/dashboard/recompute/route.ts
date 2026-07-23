import { NextResponse } from "next/server";
import { requireOwner, isErrorResponse } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";
import { backfillRequestEnergy } from "@/modules/energy/backfill";
import { monthStart } from "@/modules/pricing/engine";
import { runRollupForMonths } from "@/modules/rollup/compute";

export async function POST(request: Request) {
  const ctx = await requireOwner();
  if (isErrorResponse(ctx)) return ctx;

  const body = (await request.json().catch(() => ({}))) as {
    months?: string[];
  };

  const supabase = await createClient();

  let months = body.months ?? [];

  if (months.length === 0) {
    const { data: summaries } = await supabase
      .from("monthly_client_summary")
      .select("month")
      .eq("tenant_id", ctx.tenantId);

    const { data: logs } = await supabase
      .from("ai_request_log")
      .select("requested_at")
      .eq("tenant_id", ctx.tenantId)
      .limit(5000);

    const { data: revenues } = await supabase
      .from("client_revenue")
      .select("month")
      .eq("tenant_id", ctx.tenantId);

    const set = new Set<string>();
    for (const row of summaries ?? []) set.add(row.month);
    for (const row of revenues ?? []) set.add(row.month);
    for (const row of logs ?? []) {
      set.add(monthStart(new Date(row.requested_at)));
    }

    // Always include current calendar month
    set.add(monthStart(new Date()));
    months = [...set];
  }

  months = months.map((m) => {
    if (/^\d{4}-\d{2}$/.test(m)) return `${m}-01`;
    return m.slice(0, 10);
  });

  if (months.length === 0) {
    return NextResponse.json({ recomputedMonths: [], message: "No months to recompute" });
  }

  // Refresh threshold from DB in case it was just updated
  const { data: tenant } = await supabase
    .from("tenants")
    .select("red_flag_threshold")
    .eq("id", ctx.tenantId)
    .single();

  const threshold = Number(
    tenant?.red_flag_threshold ?? ctx.tenant.red_flag_threshold
  );

  // Backfill energy from tokens + effective coefficients before rollup
  const energyRowsUpdated = await backfillRequestEnergy(
    supabase,
    ctx.tenantId,
    months
  );

  await runRollupForMonths(supabase, ctx.tenantId, months, threshold);

  return NextResponse.json({
    recomputedMonths: months,
    red_flag_threshold: threshold,
    energy_rows_updated: energyRowsUpdated,
  });
}
