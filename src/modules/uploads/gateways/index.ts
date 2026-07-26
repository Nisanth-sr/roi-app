import type { PaymentGateway } from "@/lib/onboarding-options";
import type { UploadRowError } from "@/lib/types";
import { roundMoney } from "@/modules/pricing/engine";
import { chargebeeAdapter } from "./chargebee";
import { lemonSqueezyAdapter } from "./lemon-squeezy";
import { paddleAdapter } from "./paddle";
import { stripeAdapter } from "./stripe";
import type { AggregatedRevenueRow, GatewayAdapter } from "./types";

export type { AggregatedRevenueRow, GatewayAdapter, GatewayRevenueRow } from "./types";

/**
 * Most specific signatures first. Stripe's Payments export has the loosest
 * header signature, so it is checked last to avoid shadowing the others.
 */
export const GATEWAY_ADAPTERS: GatewayAdapter[] = [
  lemonSqueezyAdapter,
  paddleAdapter,
  chargebeeAdapter,
  stripeAdapter,
];

/** Currencies with no minor unit — a "cents" value is already the full amount. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "JPY",
  "KRW",
  "VND",
  "CLP",
  "ISK",
  "XAF",
  "XOF",
]);

export function toMajorUnits(
  amount: number,
  currency: string,
  unit: GatewayAdapter["amountUnit"]
): number {
  if (unit === "major") return amount;
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) return amount;
  return amount / 100;
}

/**
 * Picks the adapter whose header signature matches the file. The tenant's
 * declared gateway only breaks ties between multiple matches — a Stripe export
 * is still read as Stripe even if the workspace says Paddle.
 */
export function detectAdapter(
  headers: string[],
  declaredGateway?: string | null
): GatewayAdapter | null {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const matches = GATEWAY_ADAPTERS.filter((a) => a.detect(normalized));

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  const declared = matches.find((a) => a.id === declaredGateway);
  return declared ?? matches[0];
}

export function gatewayAdapterFor(
  gateway: PaymentGateway | string | null | undefined
): GatewayAdapter | null {
  return GATEWAY_ADAPTERS.find((a) => a.id === gateway) ?? null;
}

function periodMonthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

type Group = {
  candidateRefs: string[];
  displayName: string;
  periodMonth: string;
  firstRow: number;
  amountByCurrency: Map<string, number>;
};

export type AggregateResult = {
  rows: AggregatedRevenueRow[];
  errors: UploadRowError[];
  /** Source rows the adapter rejected as non-revenue (failed, refunded, draft). */
  skippedRows: number;
  totalAmount: number;
};

/**
 * Collapses per-transaction gateway rows into one revenue figure per
 * client-month. A client-month spanning multiple currencies is reported as an
 * error rather than summed, since mixing currencies would silently corrupt
 * margins.
 */
export function aggregateGatewayRows(
  rawRows: Record<string, string>[],
  adapter: GatewayAdapter
): AggregateResult {
  const groups = new Map<string, Group>();
  const errors: UploadRowError[] = [];
  let skippedRows = 0;

  rawRows.forEach((raw, index) => {
    const rowNum = index + 2; // header + 1-based
    const normalized = adapter.normalize(raw);

    if (!normalized) {
      skippedRows += 1;
      return;
    }

    const currency = normalized.currency.toUpperCase();
    const amount = toMajorUnits(normalized.amount, currency, adapter.amountUnit);
    const periodMonth = periodMonthOf(normalized.occurredAt);
    const key = `${normalized.candidateRefs[0].toLowerCase()}::${periodMonth}`;

    const existing = groups.get(key);
    if (existing) {
      existing.amountByCurrency.set(
        currency,
        (existing.amountByCurrency.get(currency) ?? 0) + amount
      );
      return;
    }

    groups.set(key, {
      candidateRefs: normalized.candidateRefs,
      displayName: normalized.displayName,
      periodMonth,
      firstRow: rowNum,
      amountByCurrency: new Map([[currency, amount]]),
    });
  });

  const rows: AggregatedRevenueRow[] = [];
  let totalAmount = 0;

  for (const group of groups.values()) {
    if (group.amountByCurrency.size > 1) {
      const currencies = [...group.amountByCurrency.keys()].sort().join(", ");
      errors.push({
        row: group.firstRow,
        field: "currency",
        message: `${group.displayName} has ${currencies} in ${group.periodMonth}. Filter the export to one currency and re-upload.`,
      });
      continue;
    }

    const [currency, amount] = [...group.amountByCurrency.entries()][0];
    const rounded = roundMoney(amount);
    totalAmount += rounded;

    rows.push({
      candidateRefs: group.candidateRefs,
      displayName: group.displayName,
      periodMonth: group.periodMonth,
      currency,
      amount: rounded,
    });
  }

  return { rows, errors, skippedRows, totalAmount: roundMoney(totalAmount) };
}
