import { describe, expect, it } from "vitest";
import type { Client, ModelPricing } from "@/lib/types";
import { validateLogRows, validateRevenueRows } from "@/modules/uploads/validate";

const clients: Client[] = [
  {
    id: "uuid-a",
    tenant_id: "t1",
    name: "Client A",
    external_ref: "client-a",
    created_at: "2026-01-01",
  },
  {
    id: "uuid-b",
    tenant_id: "t1",
    name: "Client B",
    external_ref: "client-b",
    created_at: "2026-01-01",
  },
];

const pricing: ModelPricing[] = [
  {
    id: "p1",
    provider: "bedrock",
    model_id: "claude-sonnet-4-6",
    input_price_per_1m: 3,
    output_price_per_1m: 15,
    cached_input_price_per_1m: null,
    effective_from: "2026-01-01",
    effective_to: null,
    verified_at: null,
    source_url: null,
    created_at: "2026-01-01",
  },
];

describe("upload validation", () => {
  it("accepts valid log rows and computes cost", () => {
    const { valid, errors } = validateLogRows(
      [
        {
          client_id: "client-a",
          request_timestamp: "2026-06-15T10:00:00Z",
          model_id: "claude-sonnet-4-6",
          input_tokens: "1000",
          output_tokens: "500",
        },
      ],
      clients,
      pricing
    );
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0].computedCost).toBeGreaterThan(0);
  });

  it("fails rows with unknown client — never silent drop", () => {
    const { valid, errors } = validateLogRows(
      [
        {
          client_id: "unknown",
          request_timestamp: "2026-06-15T10:00:00Z",
          model_id: "claude-sonnet-4-6",
          input_tokens: "100",
          output_tokens: "50",
        },
      ],
      clients,
      pricing
    );
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Unknown client");
  });

  it("fails rows outside pricing date range", () => {
    const { valid, errors } = validateLogRows(
      [
        {
          client_id: "client-a",
          request_timestamp: "2025-01-01T10:00:00Z",
          model_id: "claude-sonnet-4-6",
          input_tokens: "100",
          output_tokens: "50",
        },
      ],
      clients,
      pricing
    );
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("No pricing");
  });

  it("validates revenue rows", () => {
    const { valid, errors } = validateRevenueRows(
      [
        {
          client_id: "client-b",
          revenue_amount: "100",
          currency: "USD",
          period_month: "2026-06",
        },
      ],
      clients
    );
    expect(errors).toHaveLength(0);
    expect(valid[0].revenueAmount).toBe(100);
    expect(valid[0].month).toBe("2026-06-01");
  });
});
