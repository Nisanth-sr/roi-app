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

/** Black/white margin emphasis — no color palette. */
export function marginColor(marginPercent: number | null, redFlag: boolean): string {
  if (redFlag) return "font-semibold text-black";
  if (marginPercent === null) return "text-[var(--muted)]";
  if (marginPercent >= 50) return "font-semibold text-black";
  if (marginPercent >= 20) return "text-black";
  return "font-medium text-black";
}
