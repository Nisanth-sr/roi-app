import Link from "next/link";
import { formatCurrency, formatPercent, marginColor } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const month = new Date().toISOString().slice(0, 7) + "-01";

  const { data: summaries } = await supabase
    .from("monthly_client_summary")
    .select("*, clients(name, external_ref)")
    .eq("month", month)
    .order("margin_percent", { ascending: true });

  const rows = summaries ?? [];
  const totalRevenue = rows.reduce((s, r) => s + Number(r.total_revenue), 0);
  const totalCost = rows.reduce((s, r) => s + Number(r.total_cost), 0);
  const blendedMargin = totalRevenue - totalCost;
  const blendedPct = totalRevenue > 0 ? (blendedMargin / totalRevenue) * 100 : null;
  const redFlagCount = rows.filter((r) => r.red_flag).length;

  const hasData = rows.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Portfolio overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Current month: {month.slice(0, 7)}
        </p>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <h2 className="text-lg font-medium text-zinc-900">No margin data yet</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Add your clients, then upload AI request logs and revenue files to see
            per-client margins.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/dashboard/clients"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              Add clients
            </Link>
            <Link
              href="/dashboard/upload"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
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
              label="Red flags"
              value={String(redFlagCount)}
              sub={redFlagCount > 0 ? "Needs attention" : "All clear"}
              alert={redFlagCount > 0}
            />
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-zinc-900">
                Clients — worst margin first
              </h2>
              {redFlagCount > 0 && (
                <Link
                  href="/dashboard/red-flags"
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  View all red flags →
                </Link>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-500">
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
                      <tr key={row.client_id} className="border-t border-zinc-100">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/clients/${row.client_id}`}
                            className="font-medium text-zinc-900 hover:underline"
                          >
                            {name}
                            {row.red_flag && (
                              <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                                Red flag
                              </span>
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
                          className={`px-4 py-3 font-medium ${marginColor(pct, row.red_flag)}`}
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
      className={`rounded-xl border bg-white p-5 ${alert ? "border-red-200" : "border-zinc-200"}`}
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${alert ? "text-red-600" : "text-zinc-900"}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-sm text-zinc-500">{sub}</p>}
    </div>
  );
}
