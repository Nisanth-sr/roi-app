import type { PaymentGateway } from "@/lib/onboarding-options";

/** One settled charge/invoice/order from a native gateway export. */
export type GatewayRevenueRow = {
  /** Customer identifiers tried in order against clients.external_ref / id / name. */
  candidateRefs: string[];
  displayName: string;
  amount: number;
  currency: string;
  occurredAt: Date;
};

export type GatewayAdapter = {
  id: Exclude<PaymentGateway, "other">;
  label: string;
  /**
   * Whether export amounts are major units (12.50) or minor units (1250).
   * Declared per gateway rather than sniffed so a wrong assumption shows up
   * as an obviously wrong total instead of silently skewing margins.
   */
  amountUnit: "major" | "minor";
  /** Column headers that uniquely identify this gateway's export. */
  detect: (headers: string[]) => boolean;
  /** Returns null for rows that are not settled revenue (failed, refunded, draft). */
  normalize: (row: Record<string, string>) => GatewayRevenueRow | null;
};

/** Internal revenue shape produced after aggregation, fed to validateRevenueRows. */
export type AggregatedRevenueRow = {
  candidateRefs: string[];
  displayName: string;
  periodMonth: string;
  currency: string;
  amount: number;
};

export function pick(
  row: Record<string, string>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value.trim() !== "") return value.trim();
  }
  return undefined;
}

export function hasAny(headers: string[], keys: string[]): boolean {
  return headers.some((h) => keys.includes(h));
}

export function parseAmount(value: string | undefined): number | null {
  if (!value) return null;
  // Gateway exports quote thousands separators and currency symbols
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeStatus(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}
