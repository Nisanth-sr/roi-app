"use client";

import Link from "next/link";
import { useState } from "react";

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
        <h1 className="text-2xl font-semibold text-zinc-900">Upload data</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload your AI request logs and client revenue. Margin updates within seconds.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UploadCard
          title="AI request logs"
          description="CSV or JSON with client_id, request_timestamp, model_id, input_tokens, output_tokens."
          file={logFile}
          onFileChange={setLogFile}
          onUpload={uploadLogs}
          loading={loading === "logs"}
          result={logResult}
        />
        <UploadCard
          title="Client revenue"
          description="CSV with client_id, revenue_amount, currency, period_month (YYYY-MM or YYYY-MM-DD)."
          file={revenueFile}
          onFileChange={setRevenueFile}
          onUpload={uploadRevenue}
          loading={loading === "revenue"}
          result={revenueResult}
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-medium text-zinc-900">First time?</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>
            <Link href="/dashboard/clients" className="text-zinc-900 underline">
              Add your clients
            </Link>{" "}
            with matching external_ref IDs used in your logs.
          </li>
          <li>Upload AI request logs for the month.</li>
          <li>Upload revenue for the same period.</li>
          <li>
            <Link href="/dashboard" className="text-zinc-900 underline">
              View your dashboard
            </Link>{" "}
            — margins appear immediately.
          </li>
        </ol>
      </div>
    </div>
  );
}

function UploadCard({
  title,
  description,
  file,
  onFileChange,
  onUpload,
  loading,
  result,
}: {
  title: string;
  description: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  onUpload: () => void;
  loading: boolean;
  result: UploadResponse | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="font-medium text-zinc-900">{title}</h2>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
      <input
        type="file"
        accept=".csv,.json"
        className="mt-4 block w-full text-sm"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      <button
        onClick={onUpload}
        disabled={!file || loading}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload"}
      </button>
      {result && (
        <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm">
          {result.error ? (
            <p className="text-red-600">{result.error}</p>
          ) : (
            <>
              <p className="text-emerald-700">
                {result.rowCount} rows stored, {result.errorCount} errors
              </p>
              {result.affectedMonths?.length > 0 && (
                <p className="mt-1 text-zinc-500">
                  Updated months: {result.affectedMonths.join(", ")}
                </p>
              )}
              {result.errors?.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto text-red-600">
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
