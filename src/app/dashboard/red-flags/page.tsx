import Link from "next/link";
import { formatCurrency, formatPercent, marginColor } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function RedFlagsPage() {
  const supabase = await createClient();
  const month = new Date().toISOString().slice(0, 7) + "-01";

  const { data: rows } = await supabase
    .from("monthly_client_summary")
    .select("*, clients(name, external_ref)")
    .eq("month", month)
    .eq("red_flag", true)
    .order("margin_percent", { ascending: true });

  const redFlags = rows ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Red flags</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Clients below your margin threshold ({month.slice(0, 7)}).
        </p>
      </div>

      {redFlags.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-emerald-700 font-medium">No red flags this month.</p>
          <p className="mt-2 text-sm text-zinc-500">
            All clients are above the margin threshold, or no data uploaded yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-red-50 text-left text-red-800">
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
                  <tr key={row.client_id} className="border-t border-red-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/clients/${row.client_id}`}
                        className="font-medium text-zinc-900 hover:underline"
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
                    <td className={`px-4 py-3 font-medium ${marginColor(pct, true)}`}>
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
