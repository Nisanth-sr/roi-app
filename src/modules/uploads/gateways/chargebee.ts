import {
  hasAny,
  normalizeStatus,
  parseAmount,
  parseDate,
  pick,
  type GatewayAdapter,
} from "./types";

const CUSTOMER_ID = ["customer id", "customer_id", "customerid"];
const CUSTOMER_EMAIL = ["customer email", "email"];
const CUSTOMER_NAME = [
  "customer name",
  "company",
  "first name",
  "billing address company",
];
const INVOICE_DATE = ["invoice date", "date", "paid at", "paid_at"];
const AMOUNT_PAID = ["amount paid", "amount_paid"];
const TOTAL = ["total"];
const CURRENCY = ["currency code", "currency_code", "currency"];
const STATUS = ["status"];

const SETTLED = new Set(["paid", "success"]);

/**
 * Chargebee → Settings → Import & Export Data → Invoices (or Logs → Transactions).
 * Chargebee reports money in minor units (cents).
 */
export const chargebeeAdapter: GatewayAdapter = {
  id: "chargebee",
  label: "Chargebee",
  amountUnit: "minor",

  detect(headers) {
    if (!hasAny(headers, CUSTOMER_ID)) return false;
    return hasAny(headers, INVOICE_DATE) || hasAny(headers, AMOUNT_PAID);
  },

  normalize(row) {
    const status = normalizeStatus(pick(row, STATUS));
    if (status && !SETTLED.has(status)) return null;

    const amount = parseAmount(pick(row, [...AMOUNT_PAID, ...TOTAL]));
    if (amount === null || amount <= 0) return null;

    const occurredAt = parseDate(pick(row, INVOICE_DATE));
    if (!occurredAt) return null;

    const customerId = pick(row, CUSTOMER_ID);
    const email = pick(row, CUSTOMER_EMAIL);
    const name = pick(row, CUSTOMER_NAME);

    const candidateRefs = [customerId, email, name].filter(
      (v): v is string => Boolean(v)
    );
    if (candidateRefs.length === 0) return null;

    return {
      candidateRefs,
      displayName: name ?? email ?? customerId ?? "Chargebee customer",
      amount,
      currency: (pick(row, CURRENCY) ?? "USD").toUpperCase(),
      occurredAt,
    };
  },
};
