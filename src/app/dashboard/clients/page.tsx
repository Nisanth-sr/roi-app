"use client";

import { useCallback, useEffect, useState } from "react";
import { SampleCsvLink } from "@/components/SampleCsvLink";

type Client = {
  id: string;
  name: string;
  external_ref: string | null;
};

type UploadResponse = {
  rowCount: number;
  errorCount: number;
  errors: { row: number; field?: string; message: string }[];
  error?: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<UploadResponse | null>(null);
  const [dragging, setDragging] = useState(false);

  async function loadClients() {
    const res = await fetch("/api/clients");
    const data = (await res.json()) as { clients: Client[] };
    setClients(data.clients ?? []);
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, external_ref: externalRef || undefined }),
    });

    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to add client");
      setLoading(false);
      return;
    }

    setName("");
    setExternalRef("");
    await loadClients();
    setLoading(false);
  }

  const pickFile = useCallback((list: FileList | null) => {
    const next = list?.[0] ?? null;
    if (!next) return;
    const lower = next.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".json")) return;
    setCsvFile(next);
    setCsvResult(null);
  }, []);

  async function uploadCsv() {
    if (!csvFile) return;
    setCsvLoading(true);
    setCsvResult(null);

    const form = new FormData();
    form.append("file", csvFile);

    const res = await fetch("/api/clients/upload", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as UploadResponse;
    if (!res.ok) {
      setCsvResult({
        rowCount: 0,
        errorCount: 0,
        errors: [],
        error: data.error ?? "Upload failed",
      });
      setCsvLoading(false);
      return;
    }

    setCsvResult(data);
    setCsvFile(null);
    await loadClients();
    setCsvLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-black">Clients</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Add the clients you bill. Use external_ref to match IDs in your log
          exports — one at a time or via CSV.
        </p>
      </div>

      <form
        onSubmit={addClient}
        className="brand-panel p-6"
      >
        <h2 className="font-medium text-black">Add client</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-black">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-black"
              placeholder="Client A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black">
              External ref (optional)
            </label>
            <input
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-black"
              placeholder="client-a"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-black">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add client
        </button>
      </form>

      <section className="brand-panel p-6">
        <h2 className="font-medium text-black">Import clients from CSV</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          CSV or JSON with <code className="text-xs">name</code> (required) and{" "}
          <code className="text-xs">external_ref</code> (recommended). Duplicate
          refs are reported as errors; valid rows still import.
        </p>
        <p className="mt-2 text-sm">
          <SampleCsvLink
            href="/samples/sample-clients.csv"
            label="Download sample clients CSV"
          />
          <span className="text-[var(--muted)]">
            {" "}
            — fill in your clients, then upload below.
          </span>
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
            {csvFile ? (
              <span className="font-medium text-black">{csvFile.name}</span>
            ) : (
              <>
                Drop a CSV/JSON file here, or{" "}
                <label className="cursor-pointer font-medium text-black underline">
                  browse
                  <input
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    className="sr-only"
                    onChange={(e) => pickFile(e.target.files)}
                  />
                </label>
              </>
            )}
          </p>
          {csvFile && (
            <button
              type="button"
              className="mt-2 text-xs text-[var(--muted)] underline"
              onClick={() => {
                setCsvFile(null);
                setCsvResult(null);
              }}
            >
              Clear
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={uploadCsv}
          disabled={!csvFile || csvLoading}
          className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {csvLoading ? "Importing…" : "Import clients"}
        </button>

        {csvResult && (
          <div className="mt-4 rounded-lg bg-[var(--surface)] p-4 text-sm">
            {csvResult.error ? (
              <p className="text-black">{csvResult.error}</p>
            ) : (
              <>
                <p className="text-black">
                  {csvResult.rowCount} clients imported, {csvResult.errorCount}{" "}
                  errors
                </p>
                {csvResult.errors?.length > 0 && (
                  <ul className="mt-2 max-h-40 overflow-y-auto text-black">
                    {csvResult.errors.slice(0, 20).map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                    {csvResult.errors.length > 20 && (
                      <li>…and {csvResult.errors.length - 20} more</li>
                    )}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <div className="overflow-hidden brand-panel">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--surface)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">External ref</th>
              <th className="px-4 py-3 font-medium">ID</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[var(--muted)]">
                  No clients yet. Add your first client above before uploading
                  logs.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium text-black">{c.name}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {c.external_ref ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">
                    {c.id}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
