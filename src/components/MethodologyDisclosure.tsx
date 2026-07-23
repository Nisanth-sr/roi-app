"use client";

import { useId, useState } from "react";

export type MethodologySource = {
  modelFamily: string;
  modelIdPattern: string | null;
  whPerMillionTokens: number;
  overheadFactor: number;
  sourceCitation: string;
  notes: string | null;
};

type MethodologyDisclosureProps = {
  lastUpdated: string | null;
  sources: MethodologySource[];
};

export function MethodologyDisclosure({
  lastUpdated,
  sources,
}: MethodologyDisclosureProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div className="brand-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-black">
            Energy methodology
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Figures are estimates, not metered measurements. Last coefficient
            update: {lastUpdatedLabel}.
          </p>
        </div>
        <button
          type="button"
          className="brand-btn-ghost"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide details" : "View methodology"}
        </button>
      </div>

      {open && (
        <div
          id={panelId}
          className="mt-4 space-y-4 border-t border-[var(--border)] pt-4 text-sm text-black"
        >
          <div>
            <h3 className="font-medium">What this is</h3>
            <p className="mt-1 text-[var(--muted)]">
              Token-based energy estimation for efficiency ROI — not a
              sustainability, ESG, or carbon-accounting product. Providers do
              not expose per-call energy telemetry; values are derived from
              published coefficient tables.
            </p>
          </div>

          <div>
            <h3 className="font-medium">Formula</h3>
            <p className="mt-1 font-mono text-xs text-[var(--muted)]">
              Wh ≈ (input_tokens + output_tokens) / 1e6 × Wh_per_MTok ×
              overhead_factor
            </p>
          </div>

          <div>
            <h3 className="font-medium">Included / excluded</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--muted)]">
              <li>Included: estimated inference energy for the model call</li>
              <li>
                Excluded: end-user device energy, network transmission, training
                amortization, data-center PUE beyond the overhead factor
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium">Coefficient sources</h3>
            {sources.length === 0 ? (
              <p className="mt-1 text-[var(--muted)]">
                No coefficients loaded. Seed energy_coefficients and recompute.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {sources.map((s) => (
                  <li
                    key={`${s.modelFamily}:${s.modelIdPattern ?? "family"}`}
                    className="rounded border border-[var(--border)] p-3"
                  >
                    <p className="font-medium">
                      {s.modelIdPattern ?? `${s.modelFamily} (family fallback)`}
                    </p>
                    <p className="mt-1 text-[var(--muted)]">
                      {s.whPerMillionTokens} Wh / MTok · overhead{" "}
                      {s.overheadFactor}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {s.sourceCitation}
                    </p>
                    {s.notes && (
                      <p className="mt-1 text-xs text-[var(--muted)]">{s.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
