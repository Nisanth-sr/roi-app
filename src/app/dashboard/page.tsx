import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  ClientsMarginTable,
  type ClientMarginRow,
} from "@/components/ClientsMarginTable";
import { MethodologyDisclosure } from "@/components/MethodologyDisclosure";
import { MonthPicker } from "@/components/MonthPicker";
import { resolveDashboardMonth } from "@/lib/dashboard-month";
import {
  formatCurrency,
  formatEnergyPerRequest,
  formatEnergyWh,
  formatPercent,
} from "@/lib/format";
import type { EnergyCoefficient } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { latestCoefficientUpdatedAt } from "@/modules/energy/engine";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { month, monthLabel, availableMonths, shouldRedirect } =
    await resolveDashboardMonth(supabase, params.month);

  if (shouldRedirect) {
    redirect(`/dashboard?month=${monthLabel}`);
  }

  const [{ data: summaries, error: summaryError }, { data: coefficientRows, error: coeffError }] =
    await Promise.all([
      supabase
        .from("monthly_client_summary")
        .select("*, clients(name, external_ref)")
        .eq("month", month)
        .order("margin_percent", { ascending: true }),
      supabase.from("energy_coefficients").select("*"),
    ]);

  const energySchemaReady = !coeffError;
  const coefficients = energySchemaReady
    ? ((coefficientRows ?? []) as EnergyCoefficient[])
    : [];
  const methodologySources = coefficients
    .filter((c) => !c.effective_to || c.effective_to >= month)
    .map((c) => ({
      modelFamily: c.model_family,
      modelIdPattern: c.model_id_pattern,
      whPerMillionTokens: Number(c.wh_per_million_tokens),
      overheadFactor: Number(c.overhead_factor),
      sourceCitation: c.source_citation,
      notes: c.notes,
    }));

  const rows = (summaries ?? []).filter(
    (r) =>
      Number(r.total_revenue) > 0 ||
      Number(r.total_cost) > 0 ||
      Number(r.total_energy_wh ?? 0) > 0
  );
  const totalRevenue = rows.reduce((s, r) => s + Number(r.total_revenue), 0);
  const totalCost = rows.reduce((s, r) => s + Number(r.total_cost), 0);
  const blendedMargin = totalRevenue - totalCost;
  const blendedPct = totalRevenue > 0 ? (blendedMargin / totalRevenue) * 100 : null;
  const redFlagCount = rows.filter((r) => r.red_flag).length;
  const totalEnergyWh = rows.reduce(
    (s, r) => s + Number(r.total_energy_wh ?? 0),
    0
  );
  const totalRequests = rows.reduce(
    (s, r) => s + Number(r.request_count ?? 0),
    0
  );
  const energyPerRequest =
    totalRequests > 0 ? totalEnergyWh / totalRequests : null;
  const needsEnergyBackfill =
    energySchemaReady &&
    rows.length > 0 &&
    totalCost > 0 &&
    totalRequests === 0;

  const hasData = rows.length > 0;

  const tableRows: ClientMarginRow[] = rows.map((row) => {
    const name =
      (row.clients as { name: string } | null)?.name ?? "Unknown";
    const perReq =
      row.energy_wh_per_request !== null &&
      row.energy_wh_per_request !== undefined
        ? Number(row.energy_wh_per_request)
        : Number(row.request_count) > 0
          ? Number(row.total_energy_wh) / Number(row.request_count)
          : null;
    return {
      clientId: row.client_id as string,
      name,
      redFlag: Boolean(row.red_flag),
      totalRevenue: Number(row.total_revenue),
      totalCost: Number(row.total_cost),
      margin: Number(row.margin),
      marginPercent: row.margin_percent as number | null,
      energyWhPerRequest: perReq,
      totalEnergyWh: Number(row.total_energy_wh ?? 0),
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black">Portfolio overview</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Per-client margin for {monthLabel}
          </p>
        </div>
        <Suspense
          fallback={
            <span className="text-sm text-[var(--muted)]">Loading period…</span>
          }
        >
          <MonthPicker availableMonths={availableMonths} />
        </Suspense>
      </div>

      {!energySchemaReady && (
        <div className="brand-panel border-dashed p-5">
          <h2 className="text-sm font-medium text-black">
            Energy schema not applied
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Run{" "}
            <code className="text-xs">supabase/migrations/00002_energy_per_outcome.sql</code>{" "}
            in the Supabase SQL editor, hard-refresh this page, then use{" "}
            <Link href="/dashboard/settings" className="underline">
              Settings → Recompute margins &amp; energy
            </Link>
            .
            {coeffError?.message ? (
              <>
                {" "}
                ({coeffError.message})
              </>
            ) : null}
          </p>
        </div>
      )}

      {energySchemaReady && coefficients.length === 0 && (
        <div className="brand-panel border-dashed p-5">
          <h2 className="text-sm font-medium text-black">
            No energy coefficients seeded
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Re-run the seed section of migration 00002 (or{" "}
            <code className="text-xs">supabase/seed.sql</code>), then recompute.
          </p>
        </div>
      )}

      {needsEnergyBackfill && (
        <div className="brand-panel border-dashed p-5">
          <h2 className="text-sm font-medium text-black">
            Energy estimates not rolled up yet
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Schema is ready, but this month still shows 0 requests. Open{" "}
            <Link href="/dashboard/settings" className="underline">
              Settings → Recompute margins &amp; energy
            </Link>{" "}
            to backfill Wh from existing token logs.
          </p>
        </div>
      )}

      {summaryError && (
        <div className="brand-panel border-dashed p-5">
          <h2 className="text-sm font-medium text-black">Could not load summaries</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{summaryError.message}</p>
        </div>
      )}

      {!hasData ? (
        <div className="brand-panel border-dashed p-10 text-center">
          <h2 className="text-lg font-medium text-black">
            No margin data for {monthLabel}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Upload AI logs and revenue to see portfolio margins and energy estimates.
          </p>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              sub={
                redFlagCount > 0
                  ? "Below margin threshold"
                  : "All clients clear"
              }
              alert={redFlagCount > 0}
            />
            <StatCard
              label="Energy / request (est.)"
              value={
                energyPerRequest !== null
                  ? formatEnergyPerRequest(energyPerRequest)
                  : needsEnergyBackfill
                    ? "Pending"
                    : "—"
              }
              sub={
                needsEnergyBackfill
                  ? "Recompute in Settings"
                  : `${formatEnergyWh(totalEnergyWh)} total · Estimated`
              }
              emphasize
            />
          </div>

          <MethodologyDisclosure
            lastUpdated={latestCoefficientUpdatedAt(coefficients)}
            sources={methodologySources}
          />

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
            <ClientsMarginTable key={monthLabel} rows={tableRows} />
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
  emphasize,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
  emphasize?: boolean;
}) {
  const panelClass = alert
    ? "brand-panel-alert"
    : emphasize
      ? "brand-panel-emphasis"
      : "brand-panel";

  return (
    <div className={`${panelClass} p-5`}>
      <p className={`text-sm ${alert ? "text-white/70" : "text-[var(--muted)]"}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${alert ? "text-white" : "text-black"}`}>
        {value}
      </p>
      {sub && (
        <p className={`mt-1 text-sm ${alert ? "text-white/70" : "text-[var(--muted)]"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}
