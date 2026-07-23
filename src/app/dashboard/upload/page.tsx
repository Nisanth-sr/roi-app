"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { SampleCsvLinks } from "@/components/SampleCsvLink";

type UploadResponse = {
  batchId: string;
  rowCount: number;
  errorCount: number;
  errors: { row: number; field?: string; message: string }[];
  affectedMonths: string[];
  error?: string;
};

export default function UploadPage() {
  const [logFile, setLogFile] = useState<File | null>(null);
  const [revenueFile, setRevenueFile] = useState<File | null>(null);
  const [logResult, setLogResult] = useState<UploadResponse | null>(null);
  const [revenueResult, setRevenueResult] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState<"logs" | "revenue" | null>(null);

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

    const res = await fetch("/api/uploads/revenue", { method: "POST", body: form });
    const data = (await res.json()) as UploadResponse;
    setRevenueResult(data);
    setLoading(null);
  }

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
          sampleHref="/samples/sample-logs.csv"
          sampleLabel="Download sample logs CSV"
          accept=".csv,.json,text/csv,application/json"
          file={logFile}
          onFileChange={setLogFile}
          onUpload={uploadLogs}
          loading={loading === "logs"}
          result={logResult}
        />
        <UploadCard
          title="Client revenue"
          description="CSV or JSON with client_id, revenue_amount, currency, period_month (YYYY-MM or YYYY-MM-DD)."
          sampleHref="/samples/sample-revenue.csv"
          sampleLabel="Download sample revenue CSV"
          accept=".csv,.json,text/csv,application/json"
          file={revenueFile}
          onFileChange={setRevenueFile}
          onUpload={uploadRevenue}
          loading={loading === "revenue"}
          result={revenueResult}
        />
      </div>

      <div className="brand-panel p-6">
        <h2 className="font-medium text-black">First time?</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>
            <Link href="/dashboard/clients" className="text-black underline">
              Add your clients
            </Link>{" "}
            (or{" "}
            <a
              href="/samples/sample-clients.csv"
              download="sample-clients.csv"
              className="text-black underline"
            >
              download the clients CSV
            </a>
            ) with matching external_ref IDs used in your logs.
          </li>
          <li>
            Download the{" "}
            <a
              href="/samples/sample-logs.csv"
              download="sample-logs.csv"
              className="text-black underline"
            >
              logs
            </a>{" "}
            and{" "}
            <a
              href="/samples/sample-revenue.csv"
              download="sample-revenue.csv"
              className="text-black underline"
            >
              revenue
            </a>{" "}
            sample CSVs, replace the example rows with your data, then upload.
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
}) {
  const [dragging, setDragging] = useState(false);

  const pickFile = useCallback(
    (list: FileList | null) => {
      const next = list?.[0] ?? null;
      if (!next) return;
      const lower = next.name.toLowerCase();
      if (!lower.endsWith(".csv") && !lower.endsWith(".json")) {
        return;
      }
      onFileChange(next);
    },
    [onFileChange]
  );

  const sampleFilename = sampleHref.split("/").pop() ?? "sample.csv";

  return (
    <div className="brand-panel p-6">
      <h2 className="font-medium text-black">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      <p className="mt-2 text-sm">
        <a
          href={sampleHref}
          download={sampleFilename}
          className="font-medium text-black underline"
        >
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
        {file && (
          <button
            type="button"
            className="mt-2 text-xs text-[var(--muted)] underline"
            onClick={() => onFileChange(null)}
          >
            Clear
          </button>
        )}
      </div>

      <button
        onClick={onUpload}
        disabled={!file || loading}
        className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload"}
      </button>
      {result && (
        <div className="mt-4 rounded-lg bg-[var(--surface)] p-4 text-sm">
          {result.error ? (
            <p className="text-black">{result.error}</p>
          ) : (
            <>
              <p className="text-black">
                {result.rowCount} rows stored, {result.errorCount} errors
              </p>
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
              {result.errors?.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto text-black">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                  {result.errors.length > 20 && (
                    <li>…and {result.errors.length - 20} more</li>
                  )}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
