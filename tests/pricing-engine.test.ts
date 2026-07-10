import { describe, expect, it } from "vitest";
import {
  computeMargin,
  computeRequestCost,
  evaluateRedFlag,
  findPricingForDate,
} from "@/modules/pricing/engine";
import type { ModelPricing } from "@/lib/types";

const pricingRows: ModelPricing[] = [
  {
    id: "1",
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

describe("pricing engine", () => {
  it("computes request cost from token counts", () => {
    const cost = computeRequestCost(1_000_000, 500_000, pricingRows[0]);
    expect(cost).toBe(10.5);
  });

  it("finds effective-dated pricing", () => {
    const found = findPricingForDate(
      pricingRows,
      "claude-sonnet-4-6",
      new Date("2026-06-15")
    );
    expect(found?.id).toBe("1");
  });

  it("returns null when no pricing matches date", () => {
    const found = findPricingForDate(
      pricingRows,
      "claude-sonnet-4-6",
      new Date("2025-01-01")
    );
    expect(found).toBeNull();
  });

  it("computes margin and red flag at 20% threshold", () => {
    const { margin, marginPercent } = computeMargin(100, 85);
    expect(margin).toBe(15);
    expect(marginPercent).toBe(15);
    expect(evaluateRedFlag(100, 85, 20)).toBe(true);
    expect(evaluateRedFlag(100, 50, 20)).toBe(false);
  });

  it("flags negative margin when revenue is zero but cost is positive", () => {
    expect(evaluateRedFlag(0, 10, 20)).toBe(true);
  });
});

/** Golden scenario: Client C negative margin hidden in blended average */
describe("three-client golden scenario", () => {
  const price = pricingRows[0];

  it("Client A light usage is highly profitable", () => {
    const cost = computeRequestCost(50_000, 30_000, price);
    const { marginPercent } = computeMargin(100, cost);
    expect(marginPercent).toBeGreaterThan(50);
  });

  it("Client C heavy usage is negative margin at $100 MRR", () => {
    // Volumes high enough to exceed $100 MRR at Sonnet 4.6 rates ($3/$15 per 1M)
    const cost = computeRequestCost(30_000_000, 3_000_000, price);
    const { margin, marginPercent } = computeMargin(100, cost);
    expect(cost).toBeGreaterThan(100);
    expect(margin).toBeLessThan(0);
    expect(marginPercent).toBeLessThan(0);
    expect(evaluateRedFlag(100, cost, 20)).toBe(true);
  });

  it("blended average hides Client C loss", () => {
    const costA = computeRequestCost(50_000, 30_000, price);
    const costB = computeRequestCost(800_000, 200_000, price);
    const costC = computeRequestCost(30_000_000, 3_000_000, price);
    const totalRevenue = 300;
    const totalCost = costA + costB + costC;
    const { marginPercent } = computeMargin(totalRevenue, totalCost);
    expect(computeMargin(100, costC).margin).toBeLessThan(0);
    expect(marginPercent!).toBeGreaterThan(computeMargin(100, costC).marginPercent!);
  });
});
