import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeMargin,
  evaluateRedFlag,
  roundMoney,
} from "@/modules/pricing/engine";

export async function runRollupForMonths(
  supabase: SupabaseClient,
  tenantId: string,
  months: string[],
  redFlagThreshold: number
): Promise<void> {
  const uniqueMonths = [...new Set(months)];

  for (const month of uniqueMonths) {
    await runRollupForMonth(supabase, tenantId, month, redFlagThreshold);
  }
}

async function runRollupForMonth(
  supabase: SupabaseClient,
  tenantId: string,
  month: string,
  redFlagThreshold: number
): Promise<void> {
  const monthEnd = nextMonthStart(month);

  const { data: logs } = await supabase
    .from("ai_request_log")
    .select("client_id, computed_cost, computed_energy_wh")
    .eq("tenant_id", tenantId)
    .gte("requested_at", month)
    .lt("requested_at", monthEnd);

  const { data: revenues } = await supabase
    .from("client_revenue")
    .select("client_id, revenue_amount")
    .eq("tenant_id", tenantId)
    .eq("month", month);

  const { data: clients } = await supabase
    .from("clients")
    .select("id")
    .eq("tenant_id", tenantId);

  const costByClient = new Map<string, number>();
  const energyByClient = new Map<string, number>();
  const requestCountByClient = new Map<string, number>();

  for (const log of logs ?? []) {
    const clientId = log.client_id;
    costByClient.set(
      clientId,
      roundMoney((costByClient.get(clientId) ?? 0) + Number(log.computed_cost))
    );
    energyByClient.set(
      clientId,
      roundEnergyWh(
        (energyByClient.get(clientId) ?? 0) + Number(log.computed_energy_wh)
      )
    );
    requestCountByClient.set(
      clientId,
      (requestCountByClient.get(clientId) ?? 0) + 1
    );
  }

  const revenueByClient = new Map<string, number>();
  for (const rev of revenues ?? []) {
    revenueByClient.set(rev.client_id, Number(rev.revenue_amount));
  }

  const summaries = (clients ?? []).map((client) => {
    const totalCost = costByClient.get(client.id) ?? 0;
    const totalRevenue = revenueByClient.get(client.id) ?? 0;
    const totalEnergyWh = energyByClient.get(client.id) ?? 0;
    const requestCount = requestCountByClient.get(client.id) ?? 0;
    const { margin, marginPercent } = computeMargin(totalRevenue, totalCost);
    const energyWhPerRequest =
      requestCount > 0
        ? roundEnergyWh(totalEnergyWh / requestCount)
        : null;

    return {
      tenant_id: tenantId,
      client_id: client.id,
      month,
      total_cost: totalCost,
      total_revenue: totalRevenue,
      margin,
      margin_percent: marginPercent,
      red_flag: evaluateRedFlag(totalRevenue, totalCost, redFlagThreshold),
      total_energy_wh: totalEnergyWh,
      request_count: requestCount,
      energy_wh_per_request: energyWhPerRequest,
      computed_at: new Date().toISOString(),
    };
  });

  if (summaries.length > 0) {
    const { error } = await supabase
      .from("monthly_client_summary")
      .upsert(summaries, { onConflict: "tenant_id,client_id,month" });

    if (error) throw error;
  }
}

function nextMonthStart(month: string): string {
  const d = new Date(month);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function roundEnergyWh(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

export async function deleteUploadBatch(
  supabase: SupabaseClient,
  tenantId: string,
  batchId: string
): Promise<string[]> {
  const { data: logs } = await supabase
    .from("ai_request_log")
    .select("requested_at")
    .eq("upload_batch_id", batchId)
    .eq("tenant_id", tenantId);

  const months = new Set<string>();
  for (const log of logs ?? []) {
    months.add(log.requested_at.slice(0, 7) + "-01");
  }

  await supabase
    .from("ai_request_log")
    .delete()
    .eq("upload_batch_id", batchId)
    .eq("tenant_id", tenantId);

  const { data: revRows } = await supabase
    .from("client_revenue")
    .select("month")
    .eq("upload_batch_id", batchId)
    .eq("tenant_id", tenantId);

  for (const row of revRows ?? []) {
    months.add(row.month);
  }

  await supabase
    .from("client_revenue")
    .delete()
    .eq("upload_batch_id", batchId)
    .eq("tenant_id", tenantId);

  await supabase
    .from("upload_batches")
    .delete()
    .eq("id", batchId)
    .eq("tenant_id", tenantId);

  return [...months];
}
