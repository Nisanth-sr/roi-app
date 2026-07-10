"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  external_ref: string | null;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Clients</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Add the clients you bill. Use external_ref to match IDs in your log exports.
        </p>
      </div>

      <form
        onSubmit={addClient}
        className="rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h2 className="font-medium text-zinc-900">Add client</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Client A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              External ref (optional)
            </label>
            <input
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="client-a"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add client
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">External ref</th>
              <th className="px-4 py-3 font-medium">ID</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  No clients yet. Add your first client above before uploading logs.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.external_ref ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{c.id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
