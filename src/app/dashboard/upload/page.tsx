"use client";

import Link from "next/link";
import Papa from "papaparse";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LoadingButton } from "@/components/LoadingButton";
import { SampleCsvLinks, sampleCsvHref } from "@/components/SampleCsvLink";
import { aiModelLabel } from "@/lib/onboarding-options";
import type { GatewayImportSummary } from "@/lib/types";
import { GATEWAY_ADAPTERS, detectAdapter } from "@/modules/uploads/gateways";

type UploadRowError = { row: number; field?: string; message: string };

type UploadResponse = {
  batchId: string;
  rowCount: number;
  errorCount: number;
  errors: UploadRowError[];
  affectedMonths: string[];
  gateway?: GatewayImportSummary;
  error?: string;
};

const ERROR_PREVIEW = 10;

function downloadErrorsCsv(errors: UploadRowError[], filename: string) {
  const header = "row,field,message";
  const lines = errors.map((e) => {
    const field = (e.field ?? "").replace(/"/g, '""');
    const message = e.message.replace(/"/g, '""');
    return `${e.row},"${field}","${message}"`;
  });
  const blob = new Blob([[header, ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Reads just the header row so we can name the gateway before uploading. */
async function sniffHeaders(file: File): Promise<string[]> {
  const text = await file.slice(0, 64 * 1024).text();

  if (file.name.toLowerCase().endsWith(".json")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      return first && typeof first === "object" ? Object.keys(first) : [];
    } catch {
      return [];
    }
  }

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    preview: 1,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  return result.meta.fields ?? [];
}

export default function UploadPage() {
  const [logFile, setLogFile] = useState<File | null>(null);
  const [revenueFile, setRevenueFile] = useState<File | null>(null);
  const [logResult, setLogResult] = useState<UploadResponse | null>(null);
  const [revenueResult, setRevenueResult] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState<"logs" | "revenue" | null>(null);
  const [declaredModels, setDeclaredModels] = useState<string[] | null>(null);
  const [declaredGateway, setDeclaredGateway] = useState<string | null>(null);
  const [detectedGateway, setDetectedGateway] = useState<string | null>(null);
  const [createMissingClients, setCreateMissingClients] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const res = await fetch("/api/tenant/settings");
      if (!res.ok) {
        setDeclaredModels([]);
        return;
      }
      const data = (await res.json()) as {
        tenant: { ai_model_ids?: string[]; payment_gateway?: string | null };
      };
      setDeclaredModels(data.tenant.ai_model_ids ?? []);
      setDeclaredGateway(data.tenant.payment_gateway ?? null);
    }
    loadProfile();
  }, []);

  const handleRevenueFile = useCallback(
    async (file: File | null) => {
      setRevenueFile(file);
      setDetectedGateway(null);
      if (!file) return;

      const headers = await sniffHeaders(file);
      const adapter = detectAdapter(headers, declaredGateway);
      setDetectedGateway(adapter?.id ?? "standard");
    },
    [declaredGateway]
  );

  async function uploadLogs() {
    if (!logFile) return;
    setLoading("logs");
    setLogResult(null);

    const form = new FormData();
    form.append("file", logFile);

    const res = await fetch("/api/uploads/logs", { method: "POST", body: form });
    const data = (await res.json()) as UploadResponse;
    setLogResult(data);
    setLoading(null);
  }

  async function uploadRevenue() {
    if (!revenueFile) return;
    setLoading("revenue");
    setRevenueResult(null);

    const form = new FormData();
    form.append("file", revenueFile);
    form.append("createMissingClients", createMissingClients ? "true" : "false");

    const res = await fetch("/api/uploads/revenue", { method: "POST", body: form });
    const data = (await res.json()) as UploadResponse;
    setRevenueResult(data);
    setLoading(null);
  }

  const detectedLabel =
    detectedGateway === null
      ? null
      : detectedGateway === "standard"
        ? "Standard format — columns will be used as-is."
        : `Detected ${
            GATEWAY_ADAPTERS.find((a) => a.id === detectedGateway)?.label ??
            detectedGateway
          } export — settled rows will be grouped by customer and month.`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-black">Upload data</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Drag in your AI request logs and client revenue (CSV or JSON). Margin
          updates within seconds.
        </p>
        <SampleCsvLinks clients logs revenue />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UploadCard
          title="AI request logs"
          description="CSV or JSON with client_id, request_timestamp, model_id, input_tokens, output_tokens."
          sampleHref={sampleCsvHref("logs")}
          sampleLabel="Download sample logs CSV"
          accept=".csv,.json,text/csv,application/json"
          file={logFile}
          onFileChange={setLogFile}
          onUpload={uploadLogs}
          loading={loading === "logs"}
          result={logResult}
          onClearResult={() => setLogResult(null)}
          errorReportName="log-upload-errors.csv"
          note={
            declaredModels === null
              ? "Loading your declared models…"
              : declaredModels.length > 0
                ? `Your sample uses: ${declaredModels.map(aiModelLabel).join(", ")}.`
                : "Add the models you use under Settings → Workspace profile to personalize the sample."
          }
        />
        <UploadCard
          title="Client revenue"
          description="Upload a raw export from Stripe, Paddle, Chargebee, or Lemon Squeezy — or a CSV with client_id, revenue_amount, currency, period_month."
          sampleHref={sampleCsvHref("revenue")}
          sampleLabel="Download sample revenue CSV"
          accept=".csv,.json,text/csv,application/json"
          file={revenueFile}
          onFileChange={handleRevenueFile}
          onUpload={uploadRevenue}
          loading={loading === "revenue"}
          result={revenueResult}
          onClearResult={() => setRevenueResult(null)}
          errorReportName="revenue-upload-errors.csv"
          note={detectedLabel}
          extraControls={
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-black">
              <input
                type="checkbox"
                checked={createMissingClients}
                onChange={(e) => setCreateMissingClients(e.target.checked)}
                className="cursor-pointer"
              />
              Create missing clients automatically
            </label>
          }
        />
      </div>

      <div className="brand-panel p-6">
        <h2 className="font-medium text-black">First time?</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>
            Export revenue straight from your payment gateway (Stripe Payments
            export, Paddle Reports, Chargebee Invoices, Lemon Squeezy Orders) and
            drop the file in — no reformatting needed. Clients are created from
            the export automatically.
          </li>
          <li>
            Download the{" "}
            <a href={sampleCsvHref("logs")} className="text-black underline">
              logs sample
            </a>{" "}
            — it is pre-filled with your clients and declared models. Replace the
            token counts with your real usage, then upload.
          </li>
          <li>
            <Link href="/dashboard/clients" className="text-black underline">
              Review your clients
            </Link>{" "}
            so gateway customers map to the right names.
          </li>
          <li>
            <Link href="/dashboard" className="text-black underline">
              View your dashboard
            </Link>{" "}
            — it opens the latest month with data. Use the month picker for other
            periods.
          </li>
        </ol>
      </div>
    </div>
  );
}

function GatewaySummary({ gateway }: { gateway: GatewayImportSummary }) {
  return (
    <div className="mt-2 space-y-1 text-[var(--muted)]">
      <p className="text-black">
        {gateway.label} export: {gateway.sourceRowCount} source rows collapsed
        into {gateway.aggregatedRowCount} client-months.
      </p>
      <p>
        Total {gateway.totalAmount.toLocaleString()}{" "}
        {gateway.currencies.join(" / ") || "USD"} — amounts read as{" "}
        {gateway.amountUnit === "minor" ? "cents" : "whole units"}. Check this
        against your gateway dashboard.
      </p>
      {gateway.skippedRowCount > 0 && (
        <p>
          {gateway.skippedRowCount} rows skipped (unpaid, refunded, or
          incomplete). Refunds are not netted out.
        </p>
      )}
      {gateway.createdClients.length > 0 && (
        <p>
          Created {gateway.createdClients.length} client(s):{" "}
          {gateway.createdClients.slice(0, 5).join(", ")}
          {gateway.createdClients.length > 5 ? "…" : ""}
        </p>
      )}
      {gateway.declaredGatewayMismatch && (
        <p className="text-black">
          Note: your workspace is set to {gateway.declaredGatewayMismatch} but
          this file looks like {gateway.label}. It was imported as{" "}
          {gateway.label}.
        </p>
      )}
    </div>
  );
}

function UploadCard({
  title,
  description,
  sampleHref,
  sampleLabel,
  accept,
  file,
  onFileChange,
  onUpload,
  loading,
  result,
  onClearResult,
  errorReportName,
  note,
  extraControls,
}: {
  title: string;
  description: string;
  sampleHref: string;
  sampleLabel: string;
  accept: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  onUpload: () => void;
  loading: boolean;
  result: UploadResponse | null;
  onClearResult: () => void;
  errorReportName: string;
  note?: string | null;
  extraControls?: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  const pickFile = useCallback(
    (list: FileList | null) => {
      const next = list?.[0] ?? null;
      if (!next) return;
      const lower = next.name.toLowerCase();
      if (!lower.endsWith(".csv") && !lower.endsWith(".json")) {
        return;
      }
      onFileChange(next);
      onClearResult();
      setErrorsExpanded(false);
    },
    [onFileChange, onClearResult]
  );

  function clearAll() {
    onFileChange(null);
    onClearResult();
    setErrorsExpanded(false);
  }

  const errors = result?.errors ?? [];
  const visibleErrors = errorsExpanded
    ? errors
    : errors.slice(0, ERROR_PREVIEW);
  const hiddenCount = Math.max(0, errors.length - ERROR_PREVIEW);

  return (
    <div className="brand-panel p-6">
      <h2 className="font-medium text-black">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      <p className="mt-2 text-sm">
        <a href={sampleHref} className="font-medium text-black underline">
          {sampleLabel}
        </a>
      </p>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files);
        }}
        className={`mt-4 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging
            ? "border-black bg-[var(--surface)]"
            : "border-[var(--border)] bg-[var(--surface)]"
        }`}
      >
        <p className="text-sm text-[var(--muted)]">
          {file ? (
            <span className="font-medium text-black">{file.name}</span>
          ) : (
            <>
              Drop a CSV/JSON file here, or{" "}
              <label className="cursor-pointer font-medium text-black underline">
                browse
                <input
                  type="file"
                  accept={accept}
                  className="sr-only"
                  onChange={(e) => pickFile(e.target.files)}
                />
              </label>
            </>
          )}
        </p>
        {(file || result) && (
          <button
            type="button"
            className="mt-2 cursor-pointer text-xs text-[var(--muted)] underline"
            onClick={clearAll}
          >
            Clear
          </button>
        )}
      </div>

      {note && <p className="mt-3 text-sm text-[var(--muted)]">{note}</p>}
      {extraControls}

      {loading && (
        <div className="progress-indeterminate mt-3" aria-hidden>
          <span />
        </div>
      )}

      <LoadingButton
        type="button"
        className="mt-4"
        onClick={onUpload}
        disabled={!file || loading}
        loading={loading}
        loadingLabel="Uploading…"
      >
        Upload
      </LoadingButton>

      {result && (
        <div className="mt-4 rounded-lg bg-[var(--surface)] p-4 text-sm">
          {result.error ? (
            <p className="text-black">{result.error}</p>
          ) : (
            <>
              <p className="text-black">
                {result.rowCount} rows stored, {result.errorCount} errors
              </p>
              {result.gateway ? (
                <GatewaySummary gateway={result.gateway} />
              ) : (
                <p className="mt-1 text-[var(--muted)]">
                  Fix flagged rows in your file and re-upload. Use Clear to
                  remove the selected file.
                </p>
              )}
              {result.affectedMonths?.length > 0 && (
                <p className="mt-1 text-[var(--muted)]">
                  Updated months: {result.affectedMonths.join(", ")} —{" "}
                  <Link
                    href={`/dashboard?month=${result.affectedMonths[0].slice(0, 7)}`}
                    className="font-medium text-black underline"
                  >
                    View dashboard for {result.affectedMonths[0].slice(0, 7)}
                  </Link>
                </p>
              )}
              {errors.length > 0 && (
                <>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="cursor-pointer text-sm font-medium text-black underline"
                      onClick={() =>
                        downloadErrorsCsv(errors, errorReportName)
                      }
                    >
                      Download error report
                    </button>
                  </div>
                  <ul className="mt-2 max-h-56 overflow-y-auto text-black">
                    {visibleErrors.map((e, i) => (
                      <li key={`${e.row}-${i}`}>
                        {e.row > 0 ? `Row ${e.row}` : "Import"}
                        {e.field ? ` (${e.field})` : ""}: {e.message}
                      </li>
                    ))}
                  </ul>
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      className="mt-2 cursor-pointer text-sm font-medium text-black underline"
                      onClick={() => setErrorsExpanded((v) => !v)}
                    >
                      {errorsExpanded
                        ? "See less"
                        : `See more (${hiddenCount} more)`}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
