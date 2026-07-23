import type { SupabaseClient } from "@supabase/supabase-js";
import { toMonthInputValue, toMonthStart } from "@/lib/month";
import { monthStart } from "@/modules/pricing/engine";

/**
 * Prefer explicit ?month= when that period has data; otherwise snap to the
 * period from the most recent upload, else latest month with rollup data,
 * else calendar month. Always prefers a month that has cost/revenue when any exist.
 */
export async function resolveDashboardMonth(
  supabase: SupabaseClient,
  monthParam: string | null | undefined
): Promise<{
  month: string;
  monthLabel: string;
  availableMonths: string[];
  /** True when caller should redirect to monthLabel (empty/missing param or empty period). */
  shouldRedirect: boolean;
}> {
  const availableMonths = await listMonthsWithData(supabase);
  const latestUploadPeriod = await latestUploadedPeriodMonth(supabase);

  const preferredDefault =
    (latestUploadPeriod && availableMonths.includes(latestUploadPeriod)
      ? latestUploadPeriod
      : null) ??
    availableMonths[0] ??
    null;

  if (monthParam) {
    const monthLabel = toMonthInputValue(monthParam);
    const hasData = availableMonths.includes(monthLabel);

    if (hasData) {
      return {
        month: toMonthStart(monthParam),
        monthLabel,
        availableMonths,
        shouldRedirect: false,
      };
    }

    // Requested month is empty — snap to best available period when possible
    if (preferredDefault) {
      return {
        month: `${preferredDefault}-01`,
        monthLabel: preferredDefault,
        availableMonths: mergeMonth(availableMonths, preferredDefault),
        shouldRedirect: true,
      };
    }

    return {
      month: toMonthStart(monthParam),
      monthLabel,
      availableMonths,
      shouldRedirect: false,
    };
  }

  if (preferredDefault) {
    return {
      month: `${preferredDefault}-01`,
      monthLabel: preferredDefault,
      availableMonths: mergeMonth(availableMonths, preferredDefault),
      shouldRedirect: true,
    };
  }

  const month = toMonthStart(undefined);
  return {
    month,
    monthLabel: month.slice(0, 7),
    availableMonths,
    shouldRedirect: false,
  };
}

/** Months with any non-zero cost or revenue, newest first (YYYY-MM). */
async function listMonthsWithData(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data } = await supabase
    .from("monthly_client_summary")
    .select("month, total_cost, total_revenue")
    .order("month", { ascending: false });

  const months: string[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    if (Number(row.total_cost) <= 0 && Number(row.total_revenue) <= 0) continue;
    const label = String(row.month).slice(0, 7);
    if (seen.has(label)) continue;
    seen.add(label);
    months.push(label);
  }
  return months;
}

/**
 * period_month tied to the most recently uploaded batch
 * (from log request months and/or revenue period_month).
 */
async function latestUploadedPeriodMonth(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: batches } = await supabase
    .from("upload_batches")
    .select("id, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .limit(1);

  const batchId = batches?.[0]?.id;
  if (!batchId) return null;

  const [{ data: logs }, { data: revenues }] = await Promise.all([
    supabase
      .from("ai_request_log")
      .select("requested_at")
      .eq("upload_batch_id", batchId)
      .limit(5000),
    supabase
      .from("client_revenue")
      .select("month")
      .eq("upload_batch_id", batchId)
      .limit(5000),
  ]);

  const periods: string[] = [];
  for (const log of logs ?? []) {
    periods.push(monthStart(new Date(log.requested_at)).slice(0, 7));
  }
  for (const rev of revenues ?? []) {
    periods.push(String(rev.month).slice(0, 7));
  }

  if (periods.length === 0) return null;

  periods.sort((a, b) => b.localeCompare(a));
  return periods[0];
}

function mergeMonth(months: string[], extra: string): string[] {
  if (months.includes(extra)) return months;
  return [extra, ...months].sort((a, b) => b.localeCompare(a));
}
