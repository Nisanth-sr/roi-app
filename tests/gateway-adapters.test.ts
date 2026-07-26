import { describe, expect, it } from "vitest";
import {
  aggregateGatewayRows,
  detectAdapter,
  toMajorUnits,
} from "@/modules/uploads/gateways";

const stripeRow = {
  id: "ch_1",
  amount: "120.00",
  "amount refunded": "0",
  currency: "usd",
  "created (utc)": "2026-06-04 10:12:00",
  "customer id": "cus_123",
  "customer email": "ops@acme.test",
  "customer description": "Acme Corp",
  status: "Paid",
  captured: "true",
};

const paddleRow = {
  id: "txn_01h04",
  status: "completed",
  customer_id: "ctm_777",
  currency_code: "USD",
  billed_at: "2026-06-12T07:20:50.52Z",
  grand_total: "16500",
};

const chargebeeRow = {
  "invoice id": "INV-1",
  "customer id": "cb_cus_9",
  "customer email": "billing@globex.test",
  "invoice date": "2026-06-20",
  "amount paid": "45000",
  "currency code": "USD",
  status: "Paid",
};

const lemonRow = {
  identifier: "abc",
  order_number: "1042",
  product_name: "Pro plan",
  user_name: "Initech",
  user_email: "ap@initech.test",
  currency: "USD",
  subtotal: "9900",
  discount_total: "900",
  tax: "800",
  total: "9800",
  date_utc: "2026-06-08 12:00:00",
};

function headers(row: Record<string, string>) {
  return Object.keys(row);
}

describe("gateway detection", () => {
  it("identifies each gateway from its export headers", () => {
    expect(detectAdapter(headers(stripeRow))?.id).toBe("stripe");
    expect(detectAdapter(headers(paddleRow))?.id).toBe("paddle");
    expect(detectAdapter(headers(chargebeeRow))?.id).toBe("chargebee");
    expect(detectAdapter(headers(lemonRow))?.id).toBe("lemon_squeezy");
  });

  it("returns null for the internal revenue format", () => {
    const adapter = detectAdapter([
      "client_id",
      "revenue_amount",
      "currency",
      "period_month",
    ]);
    expect(adapter).toBeNull();
  });

  it("ignores the declared gateway when the file clearly belongs to another", () => {
    expect(detectAdapter(headers(paddleRow), "stripe")?.id).toBe("paddle");
  });
});

describe("amount units", () => {
  it("converts minor units to major", () => {
    expect(toMajorUnits(16500, "USD", "minor")).toBe(165);
  });

  it("leaves major units untouched", () => {
    expect(toMajorUnits(120.5, "USD", "major")).toBe(120.5);
  });

  it("does not divide zero-decimal currencies", () => {
    expect(toMajorUnits(5000, "JPY", "minor")).toBe(5000);
  });
});

describe("aggregation", () => {
  it("sums a customer's charges within a month", () => {
    const adapter = detectAdapter(headers(stripeRow))!;
    const { rows, totalAmount, errors } = aggregateGatewayRows(
      [
        stripeRow,
        { ...stripeRow, id: "ch_2", amount: "80.00", "created (utc)": "2026-06-20 09:00:00" },
      ],
      adapter
    );

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].periodMonth).toBe("2026-06");
    expect(rows[0].amount).toBe(200);
    expect(totalAmount).toBe(200);
  });

  it("keeps separate months apart", () => {
    const adapter = detectAdapter(headers(paddleRow))!;
    const { rows } = aggregateGatewayRows(
      [
        paddleRow,
        { ...paddleRow, id: "txn_2", billed_at: "2026-07-02T07:20:50.52Z" },
      ],
      adapter
    );

    expect(rows.map((r) => r.periodMonth).sort()).toEqual(["2026-06", "2026-07"]);
    expect(rows.every((r) => r.amount === 165)).toBe(true);
  });

  it("skips rows that are not settled revenue", () => {
    const adapter = detectAdapter(headers(stripeRow))!;
    const { rows, skippedRows } = aggregateGatewayRows(
      [
        stripeRow,
        { ...stripeRow, id: "ch_fail", status: "Failed" },
        { ...stripeRow, id: "ch_ref", "amount refunded": "120.00" },
      ],
      adapter
    );

    expect(rows).toHaveLength(1);
    expect(skippedRows).toBe(2);
  });

  it("errors instead of summing mixed currencies in one client-month", () => {
    const adapter = detectAdapter(headers(chargebeeRow))!;
    const { rows, errors } = aggregateGatewayRows(
      [chargebeeRow, { ...chargebeeRow, "currency code": "EUR" }],
      adapter
    );

    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("currency");
    expect(errors[0].message).toContain("EUR");
  });

  it("excludes merchant-of-record tax from Lemon Squeezy revenue", () => {
    const adapter = detectAdapter(headers(lemonRow))!;
    const { rows } = aggregateGatewayRows([lemonRow], adapter);

    // subtotal 9900 minus discount 900, tax excluded
    expect(rows[0].amount).toBe(90);
    expect(rows[0].candidateRefs[0]).toBe("ap@initech.test");
  });
});
