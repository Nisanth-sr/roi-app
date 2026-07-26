import {
  hasAny,
  normalizeStatus,
  parseAmount,
  parseDate,
  pick,
  type GatewayAdapter,
} from "./types";

const CUSTOMER_ID = ["customer_id", "customer id"];
const CUSTOMER_EMAIL = ["customer_email", "customer email", "email"];
const CUSTOMER_NAME = ["customer_name", "customer name"];
const CURRENCY = ["currency_code", "currency code"];
const BILLED_AT = ["billed_at", "billed at"];
const CREATED_AT = ["created_at", "created at"];
const GRAND_TOTAL = [
  "grand_total",
  "grand total",
  "details_totals_grand_total",
  "totals_grand_total",
];
const STATUS = ["status"];

const SETTLED = new Set(["completed", "paid", "billed"]);

/** Paddle → Reports → Transactions. grand_total is a minor-unit string. */
export const paddleAdapter: GatewayAdapter = {
  id: "paddle",
  label: "Paddle",
  amountUnit: "minor",

  detect(headers) {
    if (!hasAny(headers, CUSTOMER_ID)) return false;
    if (!hasAny(headers, CURRENCY)) return false;
    return hasAny(headers, BILLED_AT) || hasAny(headers, GRAND_TOTAL);
  },

  normalize(row) {
    const status = normalizeStatus(pick(row, STATUS));
    if (status && !SETTLED.has(status)) return null;

    const amount = parseAmount(pick(row, GRAND_TOTAL));
    if (amount === null || amount <= 0) return null;

    const occurredAt = parseDate(pick(row, [...BILLED_AT, ...CREATED_AT]));
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
      displayName: name ?? email ?? customerId ?? "Paddle customer",
      amount,
      currency: (pick(row, CURRENCY) ?? "USD").toUpperCase(),
      occurredAt,
    };
  },
};
