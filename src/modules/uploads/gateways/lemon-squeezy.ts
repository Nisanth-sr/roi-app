import {
  hasAny,
  normalizeStatus,
  parseAmount,
  parseDate,
  pick,
  type GatewayAdapter,
} from "./types";

const ORDER_NUMBER = ["order_number", "order number"];
const USER_EMAIL = ["user_email", "user email"];
const USER_NAME = ["user_name", "user name"];
const DATE_UTC = ["date_utc", "date utc", "created_at"];
const SUBTOTAL = ["subtotal"];
const DISCOUNT = ["discount_total", "discount total"];
const TOTAL = ["total"];
const CURRENCY = ["currency"];
const STATUS = ["status", "order_status"];
const REFUNDED = ["refunded", "refunded_at"];

const REJECTED = new Set(["refunded", "failed", "pending", "fraudulent"]);

/**
 * Lemon Squeezy → Orders → Export. Amounts are minor units (cents).
 * Uses subtotal minus discount: Lemon Squeezy is merchant of record, so the
 * tax it collects and remits is not the tenant's revenue.
 */
export const lemonSqueezyAdapter: GatewayAdapter = {
  id: "lemon_squeezy",
  label: "Lemon Squeezy",
  amountUnit: "minor",

  detect(headers) {
    return (
      hasAny(headers, ORDER_NUMBER) &&
      hasAny(headers, USER_EMAIL) &&
      hasAny(headers, DATE_UTC)
    );
  },

  normalize(row) {
    const status = normalizeStatus(pick(row, STATUS));
    if (status && REJECTED.has(status)) return null;

    if (pick(row, REFUNDED)) return null;

    const subtotal = parseAmount(pick(row, SUBTOTAL));
    const discount = parseAmount(pick(row, DISCOUNT)) ?? 0;
    const amount =
      subtotal === null ? parseAmount(pick(row, TOTAL)) : subtotal - discount;

    if (amount === null || amount <= 0) return null;

    const occurredAt = parseDate(pick(row, DATE_UTC));
    if (!occurredAt) return null;

    const email = pick(row, USER_EMAIL);
    const name = pick(row, USER_NAME);

    const candidateRefs = [email, name].filter((v): v is string => Boolean(v));
    if (candidateRefs.length === 0) return null;

    return {
      candidateRefs,
      displayName: name ?? email ?? "Lemon Squeezy customer",
      amount,
      currency: (pick(row, CURRENCY) ?? "USD").toUpperCase(),
      occurredAt,
    };
  },
};
