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

export function marginColor(marginPercent: number | null, redFlag: boolean): string {
  if (redFlag) return "text-red-600";
  if (marginPercent === null) return "text-zinc-500";
  if (marginPercent >= 50) return "text-emerald-600";
  if (marginPercent >= 20) return "text-amber-600";
  return "text-orange-600";
}
