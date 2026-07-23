import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency, formatPercent, marginColor } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const { data: history } = await supabase
    .from("monthly_client_summary")
    .select("*")
    .eq("client_id", id)
    .order("month", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-[var(--muted)] hover:text-black"
        >
          ← Back to overview
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-black">{client.name}</h1>
        {client.external_ref && (
          <p className="text-sm text-[var(--muted)]">Ref: {client.external_ref}</p>
        )}
      </div>

      {!history?.length ? (
        <div className="brand-panel border-dashed p-8 text-center text-sm text-[var(--muted)]">
          No margin history yet. Upload logs and revenue for this client.
        </div>
      ) : (
        <div className="brand-panel overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="brand-table-head">
              <tr>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
                <th className="px-4 py-3 font-medium">AI cost</th>
                <th className="px-4 py-3 font-medium">Margin</th>
                <th className="px-4 py-3 font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => {
                const pct = row.margin_percent as number | null;
                return (
                  <tr key={row.month} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{String(row.month).slice(0, 7)}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(Number(row.total_revenue))}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(Number(row.total_cost))}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(Number(row.margin))}
                    </td>
                    <td className={`px-4 py-3 ${marginColor(pct, row.red_flag)}`}>
                      {formatPercent(pct)}
                      {row.red_flag && <span className="brand-chip">Flag</span>}
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
