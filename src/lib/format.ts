export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}

/** Format estimated watt-hours; switch to kWh at scale. */
export function formatEnergyWh(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })} kWh`;
  }
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 1 ? 4 : 2,
  })} Wh`;
}

export function formatEnergyPerRequest(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${formatEnergyWh(value)} / req`;
}

/** Black/white margin emphasis — no color palette. */
export function marginColor(marginPercent: number | null, redFlag: boolean): string {
  if (redFlag) return "font-semibold text-black";
  if (marginPercent === null) return "text-[var(--muted)]";
  if (marginPercent >= 50) return "font-semibold text-black";
  if (marginPercent >= 20) return "text-black";
  return "font-medium text-black";
}
