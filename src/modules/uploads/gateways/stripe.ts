import {
  hasAny,
  normalizeStatus,
  parseAmount,
  parseDate,
  pick,
  type GatewayAdapter,
} from "./types";

const CUSTOMER_ID = ["customer id", "customer_id", "customer"];
const CUSTOMER_EMAIL = ["customer email", "customer_email", "email"];
const CUSTOMER_NAME = [
  "customer description",
  "customer name",
  "customer_description",
  "description",
];
const CREATED = ["created (utc)", "created", "created_at", "created date (utc)"];
const AMOUNT = ["amount"];
const CURRENCY = ["currency"];
const STATUS = ["status"];
const CAPTURED = ["captured"];
const REFUNDED = ["amount refunded", "amount_refunded"];

const SETTLED = new Set(["paid", "succeeded", "available", "successful"]);

/** Stripe Dashboard → Payments → Export. Amounts are already in major units. */
export const stripeAdapter: GatewayAdapter = {
  id: "stripe",
  label: "Stripe",
  amountUnit: "major",

  detect(headers) {
    const hasCustomer =
      hasAny(headers, CUSTOMER_ID) || hasAny(headers, CUSTOMER_EMAIL);
    return (
      hasCustomer && hasAny(headers, CREATED) && hasAny(headers, AMOUNT)
    );
  },

  normalize(row) {
    const status = normalizeStatus(pick(row, STATUS));
    if (status && !SETTLED.has(status)) return null;

    const captured = normalizeStatus(pick(row, CAPTURED));
    if (captured === "false") return null;

    // A fully refunded charge is not revenue for the period
    const amount = parseAmount(pick(row, AMOUNT));
    if (amount === null || amount <= 0) return null;

    const refunded = parseAmount(pick(row, REFUNDED)) ?? 0;
    if (refunded >= amount) return null;

    const occurredAt = parseDate(pick(row, CREATED));
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
      displayName: name ?? email ?? customerId ?? "Stripe customer",
      amount,
      currency: (pick(row, CURRENCY) ?? "USD").toUpperCase(),
      occurredAt,
    };
  },
};
