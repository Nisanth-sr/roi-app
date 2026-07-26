import { describe, expect, it } from "vitest";
import type { Client, EnergyCoefficient, ModelPricing } from "@/lib/types";
import {
  resolveClientIdFromCandidates,
  validateClientRows,
  validateLogRows,
  validateRevenueRows,
} from "@/modules/uploads/validate";

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

const energyCoefficients: EnergyCoefficient[] = [
  {
    id: "e1",
    model_family: "claude",
    model_id_pattern: "claude-sonnet-4-6",
    wh_per_million_tokens: 180,
    overhead_factor: 1.2,
    effective_from: "2026-01-01",
    effective_to: null,
    source_citation: "test",
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("upload validation", () => {
  it("accepts valid log rows and computes cost and energy", () => {
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
      pricing,
      energyCoefficients
    );
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0].computedCost).toBeGreaterThan(0);
    expect(valid[0].computedEnergyWh).toBeGreaterThan(0);
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
      pricing,
      energyCoefficients
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
      pricing,
      energyCoefficients
    );
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("No pricing");
  });

  it("fails rows with no energy coefficient", () => {
    const { valid, errors } = validateLogRows(
      [
        {
          client_id: "client-a",
          request_timestamp: "2026-06-15T10:00:00Z",
          model_id: "claude-sonnet-4-6",
          input_tokens: "100",
          output_tokens: "50",
        },
      ],
      clients,
      pricing,
      []
    );
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("No energy coefficient");
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

describe("candidate client resolution", () => {
  it("falls through candidates until one matches", () => {
    expect(
      resolveClientIdFromCandidates(["cus_unknown", "client-b"], clients)
    ).toBe("uuid-b");
  });

  it("matches on name when ids and emails miss", () => {
    expect(
      resolveClientIdFromCandidates(["cus_x", "nobody@test", "Client A"], clients)
    ).toBe("uuid-a");
  });

  it("returns null when nothing matches", () => {
    expect(resolveClientIdFromCandidates(["cus_x", ""], clients)).toBeNull();
  });
});

describe("client CSV validation", () => {
  it("accepts valid client rows", () => {
    const { valid, errors } = validateClientRows(
      [
        { name: "Client D", external_ref: "client-d" },
        { client_name: "Client E", client_id: "client-e" },
      ],
      clients
    );
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(2);
    expect(valid[0]).toEqual({ name: "Client D", externalRef: "client-d" });
    expect(valid[1]).toEqual({ name: "Client E", externalRef: "client-e" });
  });

  it("fails rows with missing name", () => {
    const { valid, errors } = validateClientRows(
      [{ name: "", external_ref: "client-x" }],
      clients
    );
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Missing name");
  });

  it("fails duplicate external_ref against existing clients", () => {
    const { valid, errors } = validateClientRows(
      [{ name: "Duplicate A", external_ref: "client-a" }],
      clients
    );
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("already exists");
  });

  it("fails duplicate external_ref within the file", () => {
    const { valid, errors } = validateClientRows(
      [
        { name: "One", external_ref: "client-z" },
        { name: "Two", external_ref: "client-z" },
      ],
      clients
    );
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Duplicate external_ref in file");
  });

  it("allows rows without external_ref", () => {
    const { valid, errors } = validateClientRows(
      [{ name: "No Ref Client" }],
      clients
    );
    expect(errors).toHaveLength(0);
    expect(valid).toEqual([{ name: "No Ref Client", externalRef: null }]);
  });
});
