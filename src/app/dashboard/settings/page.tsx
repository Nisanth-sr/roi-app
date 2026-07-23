"use client";

import { useCallback, useEffect, useState } from "react";

type PricingRow = {
  id: string;
  provider: string;
  model_id: string;
  input_price_per_1m: number;
  output_price_per_1m: number;
  effective_from: string;
  effective_to: string | null;
  verified_at: string | null;
  source_url: string | null;
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
  email: string | null;
};

type TenantSettings = {
  id: string;
  name: string;
  red_flag_threshold: number;
};

export default function SettingsPage() {
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [thresholdInput, setThresholdInput] = useState("20");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    input_price_per_1m: "",
    output_price_per_1m: "",
    source_url: "",
    effective_to: "",
    new_input: "",
    new_output: "",
    new_effective_from: "",
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);

    const [settingsRes, batchesRes] = await Promise.all([
      fetch("/api/tenant/settings"),
      fetch("/api/uploads/batches"),
    ]);

    if (settingsRes.ok) {
      const data = (await settingsRes.json()) as {
        tenant: TenantSettings;
        role: string;
      };
      setTenant(data.tenant);
      setThresholdInput(String(data.tenant.red_flag_threshold));
      setIsOwner(data.role === "owner");
    }

    if (batchesRes.ok) {
      const data = (await batchesRes.json()) as { batches: Batch[] };
      setBatches(data.batches ?? []);
    }

    const pricingRes = await fetch("/api/admin/pricing");
    if (pricingRes.ok) {
      const data = (await pricingRes.json()) as { pricing: PricingRow[] };
      setPricing(data.pricing ?? []);
      setIsOwner(true);
    }

    const membersRes = await fetch("/api/team/members");
    if (membersRes.ok) {
      const data = (await membersRes.json()) as { members: Member[] };
      setMembers(data.members ?? []);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function flash(msg: string, isError = false) {
    if (isError) {
      setError(msg);
      setMessage(null);
    } else {
      setMessage(msg);
      setError(null);
    }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      flash(data.error ?? "Invite failed", true);
      return;
    }
    setInviteEmail("");
    flash("Member added.");
    loadData();
  }

  async function saveThreshold(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/tenant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ red_flag_threshold: Number(thresholdInput) }),
    });
    const data = (await res.json()) as {
      error?: string;
      tenant?: TenantSettings;
    };
    setSaving(false);
    if (!res.ok) {
      flash(data.error ?? "Failed to save threshold", true);
      return;
    }
    if (data.tenant) {
      setTenant(data.tenant);
      setThresholdInput(String(data.tenant.red_flag_threshold));
    }
    flash("Threshold saved. Recompute margins to refresh red flags.");
  }

  async function recomputeMargins() {
    setSaving(true);
    const res = await fetch("/api/dashboard/recompute", { method: "POST" });
    const data = (await res.json()) as {
      error?: string;
      recomputedMonths?: string[];
    };
    setSaving(false);
    if (!res.ok) {
      flash(data.error ?? "Recompute failed", true);
      return;
    }
    flash(
      `Recomputed ${data.recomputedMonths?.length ?? 0} month(s). Check Overview / Red flags.`
    );
  }

  async function rollbackBatch(id: string) {
    if (!confirm("Delete this upload batch and recompute margins?")) return;
    setSaving(true);
    const res = await fetch(`/api/uploads/batches/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      flash(data.error ?? "Rollback failed", true);
      return;
    }
    flash("Batch rolled back.");
    loadData();
  }

  function startEdit(row: PricingRow) {
    setEditingId(row.id);
    setEditForm({
      input_price_per_1m: String(row.input_price_per_1m),
      output_price_per_1m: String(row.output_price_per_1m),
      source_url: row.source_url ?? "",
      effective_to: new Date().toISOString().slice(0, 10),
      new_input: String(row.input_price_per_1m),
      new_output: String(row.output_price_per_1m),
      new_effective_from: new Date().toISOString().slice(0, 10),
    });
  }

  async function savePricingUpdate(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/pricing/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input_price_per_1m: Number(editForm.input_price_per_1m),
        output_price_per_1m: Number(editForm.output_price_per_1m),
        source_url: editForm.source_url || undefined,
        verified_at: new Date().toISOString(),
      }),
    });
    const data = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      flash(data.error ?? "Update failed", true);
      return;
    }
    setEditingId(null);
    flash("Pricing updated and verified_at refreshed.");
    loadData();
  }

  async function closeAndReplace(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/pricing/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "close",
        effective_to: editForm.effective_to,
        new_row: {
          input_price_per_1m: Number(editForm.new_input),
          output_price_per_1m: Number(editForm.new_output),
          effective_from: editForm.new_effective_from,
          source_url: editForm.source_url || undefined,
        },
      }),
    });
    const data = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      flash(data.error ?? "Close & replace failed", true);
      return;
    }
    setEditingId(null);
    flash("Old rate closed; new rate row created. Historical costs stay frozen.");
    loadData();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-black">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Team, red-flag threshold, upload history, and model pricing
          {isOwner ? " (owners can edit)." : "."}
        </p>
      </div>

      {message && (
        <p className="rounded-lg bg-[var(--surface)] px-4 py-2 text-sm text-black">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-[var(--surface)] px-4 py-2 text-sm text-black">{error}</p>
      )}

      {tenant && (
        <section className="brand-panel p-6">
          <h2 className="font-medium text-black">Red-flag threshold</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Clients with margin % below this value are flagged. Default is 20%.
            {isOwner
              ? " Changing the threshold does not rewrite history until you recompute."
              : " Only owners can change this value."}
          </p>
          {isOwner ? (
            <form onSubmit={saveThreshold} className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-black">
                  Threshold (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  required
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  className="mt-1 w-28 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Save threshold
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={recomputeMargins}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                Recompute margins
              </button>
            </form>
          ) : (
            <p className="mt-3 text-2xl font-semibold text-black">
              {tenant.red_flag_threshold}%
            </p>
          )}
        </section>
      )}

      <section className="brand-panel p-6">
        <h2 className="font-medium text-black">Team members</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Teammates must create an account first (sign up with their work email),
          then an owner can add that same email here.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-black">
          {members.length === 0 ? (
            <li className="text-[var(--muted)]">No members loaded.</li>
          ) : (
            members.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between rounded-lg bg-[var(--surface)] px-3 py-2"
              >
                <span>{m.email ?? `${m.user_id.slice(0, 8)}…`}</span>
                <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  {m.role}
                </span>
              </li>
            ))
          )}
        </ul>
        {isOwner && (
          <form onSubmit={inviteMember} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              placeholder="teammate@company.com (must already have an account)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Add member
            </button>
          </form>
        )}
      </section>

      <section className="brand-panel p-6">
        <h2 className="font-medium text-black">Recent uploads</h2>
        {batches.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No uploads yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)] text-sm">
            {batches.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 py-3">
                <span>
                  {b.file_type} — {b.row_count} rows, {b.error_count} errors —{" "}
                  {new Date(b.uploaded_at).toLocaleString()}
                </span>
                {isOwner && (
                  <button
                    onClick={() => rollbackBatch(b.id)}
                    className="shrink-0 text-black hover:text-black"
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
        <section className="brand-panel p-6">
          <h2 className="font-medium text-black">Model pricing</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Close-and-replace when provider rates change so historical{" "}
            <code className="text-xs">computed_cost</code> stays frozen. Verify
            against provider pricing pages before pilot data.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4">Input / 1M</th>
                  <th className="py-2 pr-4">Output / 1M</th>
                  <th className="py-2 pr-4">Effective</th>
                  <th className="py-2 pr-4">Verified</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--border)] align-top">
                    <td className="py-3 pr-4 font-mono text-xs">
                      <div>{p.model_id}</div>
                      <div className="text-[var(--muted)]">{p.provider}</div>
                    </td>
                    <td className="py-3 pr-4">${p.input_price_per_1m}</td>
                    <td className="py-3 pr-4">${p.output_price_per_1m}</td>
                    <td className="py-3 pr-4 text-[var(--muted)]">
                      {p.effective_from}
                      {p.effective_to ? ` → ${p.effective_to}` : " (active)"}
                    </td>
                    <td className="py-3 pr-4 text-[var(--muted)]">
                      {p.verified_at
                        ? new Date(p.verified_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {p.source_url ? (
                        <a
                          href={p.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-black underline"
                        >
                          Link
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3">
                      {!p.effective_to && (
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-sm font-medium text-black underline"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingId && (
            <div className="mt-6 space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <h3 className="font-medium text-black">Edit pricing row</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Input $/1M
                  <input
                    type="number"
                    step="0.000001"
                    value={editForm.input_price_per_1m}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        input_price_per_1m: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  Output $/1M
                  <input
                    type="number"
                    step="0.000001"
                    value={editForm.output_price_per_1m}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        output_price_per_1m: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  Source URL
                  <input
                    type="url"
                    value={editForm.source_url}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, source_url: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                    placeholder="https://…"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => savePricingUpdate(editingId)}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Update rates (same row)
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <p className="text-sm text-[var(--muted)]">
                  Preferred when rates change: close this row and open a new
                  effective range.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-sm">
                    Close on
                    <input
                      type="date"
                      value={editForm.effective_to}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          effective_to: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    New input $/1M
                    <input
                      type="number"
                      step="0.000001"
                      value={editForm.new_input}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, new_input: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    New output $/1M
                    <input
                      type="number"
                      step="0.000001"
                      value={editForm.new_output}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          new_output: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    New effective from
                    <input
                      type="date"
                      value={editForm.new_effective_from}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          new_effective_from: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => closeAndReplace(editingId)}
                  className="mt-3 rounded-lg border border-black px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                >
                  Close &amp; replace
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
