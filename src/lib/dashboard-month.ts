import type { SupabaseClient } from "@supabase/supabase-js";
import { toMonthInputValue, toMonthStart } from "@/lib/month";

/** Prefer explicit ?month=, else latest month with rollup data, else calendar month. */
export async function resolveDashboardMonth(
  supabase: SupabaseClient,
  monthParam: string | null | undefined
): Promise<{ month: string; monthLabel: string; availableMonths: string[] }> {
  const { data: monthRows } = await supabase
    .from("monthly_client_summary")
    .select("month")
    .order("month", { ascending: false });

  const availableMonths = [
    ...new Set((monthRows ?? []).map((r) => String(r.month).slice(0, 7))),
  ];

  if (monthParam) {
    const month = toMonthStart(monthParam);
    return {
      month,
      monthLabel: toMonthInputValue(monthParam),
      availableMonths,
    };
  }

  if (availableMonths.length > 0) {
    const monthLabel = availableMonths[0];
    return {
      month: `${monthLabel}-01`,
      monthLabel,
      availableMonths,
    };
  }

  const month = toMonthStart(undefined);
  return {
    month,
    monthLabel: month.slice(0, 7),
    availableMonths,
  };
}
