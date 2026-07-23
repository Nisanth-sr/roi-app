import { describe, expect, it } from "vitest";
import type { EnergyCoefficient } from "@/lib/types";
import {
  computeRequestEnergy,
  findCoefficientForModel,
  inferModelFamily,
  latestCoefficientUpdatedAt,
} from "@/modules/energy/engine";

const coefficients: EnergyCoefficient[] = [
  {
    id: "1",
    model_family: "claude",
    model_id_pattern: "claude-sonnet-4-6",
    wh_per_million_tokens: 180,
    overhead_factor: 1.2,
    effective_from: "2026-01-01",
    effective_to: null,
    source_citation: "test citation",
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "2",
    model_family: "claude",
    model_id_pattern: null,
    wh_per_million_tokens: 180,
    overhead_factor: 1.2,
    effective_from: "2026-01-01",
    effective_to: null,
    source_citation: "family fallback",
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "3",
    model_family: "gemini",
    model_id_pattern: "gemini-2.0-flash",
    wh_per_million_tokens: 60,
    overhead_factor: 1.2,
    effective_from: "2026-01-01",
    effective_to: "2026-05-31",
    source_citation: "dated gemini",
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("energy engine", () => {
  it("computes request energy from tokens and coefficient", () => {
    // (1M + 0.5M) / 1M * 180 * 1.2 = 324
    const energy = computeRequestEnergy(1_000_000, 500_000, coefficients[0]);
    expect(energy).toBe(324);
  });

  it("prefers exact model_id_pattern over family fallback", () => {
    const found = findCoefficientForModel(
      coefficients,
      "claude-sonnet-4-6",
      new Date("2026-06-15")
    );
    expect(found?.id).toBe("1");
  });

  it("falls back to family row when no exact pattern", () => {
    const found = findCoefficientForModel(
      coefficients,
      "claude-unknown-model",
      new Date("2026-06-15")
    );
    expect(found?.id).toBe("2");
  });

  it("returns null when no coefficient matches date", () => {
    const found = findCoefficientForModel(
      coefficients,
      "gemini-2.0-flash",
      new Date("2026-06-15")
    );
    expect(found).toBeNull();
  });

  it("returns null for unknown model family", () => {
    expect(inferModelFamily("gpt-4o")).toBeNull();
    const found = findCoefficientForModel(
      coefficients,
      "gpt-4o",
      new Date("2026-06-15")
    );
    expect(found).toBeNull();
  });

  it("reports latest coefficient updated_at", () => {
    expect(latestCoefficientUpdatedAt(coefficients)).toBe(
      "2026-06-01T00:00:00Z"
    );
  });
});
