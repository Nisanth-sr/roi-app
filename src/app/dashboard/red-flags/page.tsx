import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MonthPicker } from "@/components/MonthPicker";
import { resolveDashboardMonth } from "@/lib/dashboard-month";
import { formatCurrency, formatPercent, marginColor } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function RedFlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { month, monthLabel, availableMonths } = await resolveDashboardMonth(
    supabase,
    params.month
  );

  if (!params.month && availableMonths.length > 0) {
    redirect(`/dashboard/red-flags?month=${monthLabel}`);
  }

  const { data: rows } = await supabase
    .from("monthly_client_summary")
    .select("*, clients(name, external_ref)")
    .eq("month", month)
    .eq("red_flag", true)
    .order("margin_percent", { ascending: true });

  const redFlags = (rows ?? []).filter(
    (r) => Number(r.total_revenue) > 0 || Number(r.total_cost) > 0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black">Red flags</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Clients below your margin threshold ({monthLabel}).
          </p>
        </div>
        <Suspense fallback={null}>
          <MonthPicker />
        </Suspense>
      </div>

      {redFlags.length === 0 ? (
        <div className="brand-panel p-8 text-center">
          <p className="font-medium text-black">No flags for {monthLabel}.</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            All clients are above the margin threshold, or no data was uploaded for
            this month. Try another period or{" "}
            <Link href="/dashboard/upload" className="text-black underline">
              upload files
            </Link>
            .
          </p>
          {availableMonths.filter((m) => m !== monthLabel).length > 0 && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Other periods with data:{" "}
              {availableMonths
                .filter((m) => m !== monthLabel)
                .map((m, i) => (
                  <span key={m}>
                    {i > 0 && ", "}
                    <Link
                      href={`/dashboard/red-flags?month=${m}`}
                      className="text-black underline"
                    >
                      {m}
                    </Link>
                  </span>
                ))}
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-left text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
                <th className="px-4 py-3 font-medium">AI cost</th>
                <th className="px-4 py-3 font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {redFlags.map((row) => {
                const name =
                  (row.clients as { name: string } | null)?.name ?? "Unknown";
                const pct = row.margin_percent as number | null;
                return (
                  <tr key={row.client_id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/clients/${row.client_id}`}
                        className="font-medium text-black hover:underline"
                      >
                        {name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(Number(row.total_revenue))}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(Number(row.total_cost))}
                    </td>
                    <td className={`px-4 py-3 ${marginColor(pct, true)}`}>
                      {formatPercent(pct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
