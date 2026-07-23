import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MonthPicker } from "@/components/MonthPicker";
import { resolveDashboardMonth } from "@/lib/dashboard-month";
import { formatCurrency, formatPercent, marginColor } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({
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
    redirect(`/dashboard?month=${monthLabel}`);
  }

  const { data: summaries } = await supabase
    .from("monthly_client_summary")
    .select("*, clients(name, external_ref)")
    .eq("month", month)
    .order("margin_percent", { ascending: true });

  const rows = (summaries ?? []).filter(
    (r) => Number(r.total_revenue) > 0 || Number(r.total_cost) > 0
  );
  const totalRevenue = rows.reduce((s, r) => s + Number(r.total_revenue), 0);
  const totalCost = rows.reduce((s, r) => s + Number(r.total_cost), 0);
  const blendedMargin = totalRevenue - totalCost;
  const blendedPct = totalRevenue > 0 ? (blendedMargin / totalRevenue) * 100 : null;
  const redFlagCount = rows.filter((r) => r.red_flag).length;

  const hasData = rows.length > 0;
  const otherMonths = availableMonths.filter((m) => m !== monthLabel);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black">Portfolio overview</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Per-client margin for {monthLabel}
          </p>
        </div>
        <Suspense fallback={null}>
          <MonthPicker />
        </Suspense>
      </div>

      {!hasData ? (
        <div className="brand-panel border-dashed p-10 text-center">
          <h2 className="text-lg font-medium text-black">
            No margin data for {monthLabel}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Sample fixtures use <strong className="text-black">2026-06</strong>.
            After upload, pick that month above — or upload logs/revenue for{" "}
            {monthLabel}.
          </p>
          {otherMonths.length > 0 && (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Data available for:{" "}
              {otherMonths.map((m, i) => (
                <span key={m}>
                  {i > 0 && ", "}
                  <Link
                    href={`/dashboard?month=${m}`}
                    className="font-medium text-black underline"
                  >
                    {m}
                  </Link>
                </span>
              ))}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard/clients" className="brand-btn-ghost">
              Add clients
            </Link>
            <Link href="/dashboard/upload" className="brand-btn">
              Upload files
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total MRR" value={formatCurrency(totalRevenue)} />
            <StatCard label="Total AI cost" value={formatCurrency(totalCost)} />
            <StatCard
              label="Blended margin"
              value={formatCurrency(blendedMargin)}
              sub={formatPercent(blendedPct)}
            />
            <StatCard
              label="Flags"
              value={String(redFlagCount)}
              sub={redFlagCount > 0 ? "Needs attention" : "All clear"}
              alert={redFlagCount > 0}
            />
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-black">
                Clients — worst margin first
              </h2>
              {redFlagCount > 0 && (
                <Link
                  href={`/dashboard/red-flags?month=${monthLabel}`}
                  className="text-sm font-medium text-black underline"
                >
                  View all flags →
                </Link>
              )}
            </div>
            <div className="brand-panel overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="brand-table-head">
                  <tr>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Revenue</th>
                    <th className="px-4 py-3 font-medium">AI cost</th>
                    <th className="px-4 py-3 font-medium">Margin</th>
                    <th className="px-4 py-3 font-medium">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const name =
                      (row.clients as { name: string } | null)?.name ?? "Unknown";
                    const pct = row.margin_percent as number | null;
                    return (
                      <tr
                        key={row.client_id}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/clients/${row.client_id}`}
                            className="font-medium text-black hover:underline"
                          >
                            {name}
                            {row.red_flag && (
                              <span className="brand-chip">Flag</span>
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(Number(row.total_revenue))}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(Number(row.total_cost))}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(Number(row.margin))}
                        </td>
                        <td
                          className={`px-4 py-3 ${marginColor(pct, row.red_flag)}`}
                        >
                          {formatPercent(pct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`brand-panel p-5 ${alert ? "border-black bg-black text-white" : ""}`}
    >
      <p className={`text-sm ${alert ? "text-white/70" : "text-[var(--muted)]"}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && (
        <p className={`mt-1 text-sm ${alert ? "text-white/70" : "text-[var(--muted)]"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}
