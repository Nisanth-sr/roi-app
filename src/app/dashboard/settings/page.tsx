"use client";

import { useEffect, useState } from "react";

type PricingRow = {
  id: string;
  provider: string;
  model_id: string;
  input_price_per_1m: number;
  output_price_per_1m: number;
  effective_from: string;
  effective_to: string | null;
};

type Batch = {
  id: string;
  file_type: string;
  row_count: number;
  error_count: number;
  uploaded_at: string;
};

type Member = {
  user_id: string;
  role: string;
};

export default function SettingsPage() {
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [pricingRes, batchesRes] = await Promise.all([
      fetch("/api/admin/pricing"),
      fetch("/api/uploads/batches"),
    ]);

    if (pricingRes.ok) {
      const data = (await pricingRes.json()) as { pricing: PricingRow[] };
      setPricing(data.pricing ?? []);
      setIsOwner(true);
    }

    if (batchesRes.ok) {
      const data = (await batchesRes.json()) as { batches: Batch[] };
      setBatches(data.batches ?? []);
    }

    const membersRes = await fetch("/api/team/members");
    if (membersRes.ok) {
      const data = (await membersRes.json()) as { members: Member[] };
      setMembers(data.members ?? []);
    }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "Invite failed");
      return;
    }
    setInviteEmail("");
    setMessage("Member added.");
    loadData();
  }

  async function rollbackBatch(id: string) {
    if (!confirm("Delete this upload batch and recompute margins?")) return;
    const res = await fetch(`/api/uploads/batches/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "Rollback failed");
      return;
    }
    setMessage("Batch rolled back.");
    loadData();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Team, upload history, and model pricing (owners only).
        </p>
      </div>

      {message && (
        <p className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700">{message}</p>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-medium text-zinc-900">Team members</h2>
        <ul className="mt-3 space-y-1 text-sm text-zinc-600">
          {members.map((m) => (
            <li key={m.user_id} className="font-mono text-xs">
              {m.user_id.slice(0, 8)}… — {m.role}
            </li>
          ))}
        </ul>
        {isOwner && (
          <form onSubmit={inviteMember} className="mt-4 flex gap-2">
            <input
              type="email"
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Add member
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-medium text-zinc-900">Recent uploads</h2>
        {batches.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No uploads yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {batches.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3">
                <span>
                  {b.file_type} — {b.row_count} rows, {b.error_count} errors —{" "}
                  {new Date(b.uploaded_at).toLocaleString()}
                </span>
                {isOwner && (
                  <button
                    onClick={() => rollbackBatch(b.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Rollback
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="font-medium text-zinc-900">Model pricing</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Verify rates against provider pricing pages monthly.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-zinc-500">
                <tr>
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4">Input / 1M</th>
                  <th className="py-2 pr-4">Output / 1M</th>
                  <th className="py-2 pr-4">Effective</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-100">
                    <td className="py-2 pr-4 font-mono text-xs">{p.model_id}</td>
                    <td className="py-2 pr-4">${p.input_price_per_1m}</td>
                    <td className="py-2 pr-4">${p.output_price_per_1m}</td>
                    <td className="py-2 pr-4 text-zinc-500">
                      {p.effective_from}
                      {p.effective_to ? ` → ${p.effective_to}` : " (active)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
