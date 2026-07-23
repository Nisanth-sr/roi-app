import type { EnergyCoefficient } from "@/lib/types";

/**
 * Estimates inference energy from token counts.
 * This is an estimation layer — not provider-metered energy.
 *
 * energy_wh ≈ (input + output) / 1e6 × wh_per_million_tokens × overhead_factor
 */
export function computeRequestEnergy(
  inputTokens: number,
  outputTokens: number,
  coefficient: Pick<
    EnergyCoefficient,
    "wh_per_million_tokens" | "overhead_factor"
  >
): number {
  const totalTokens = inputTokens + outputTokens;
  const energy =
    (totalTokens / 1_000_000) *
    Number(coefficient.wh_per_million_tokens) *
    Number(coefficient.overhead_factor);
  return roundEnergy(energy);
}

export function roundEnergy(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

export function inferModelFamily(modelId: string): string | null {
  const id = modelId.toLowerCase();
  if (id.includes("claude")) return "claude";
  if (id.includes("gemini")) return "gemini";
  return null;
}

/**
 * Prefer exact model_id_pattern match, then family-level row (null pattern).
 * Effective-dated like model_pricing.
 */
export function findCoefficientForModel(
  rows: EnergyCoefficient[],
  modelId: string,
  requestedAt: Date
): EnergyCoefficient | null {
  const requestDate = requestedAt.toISOString().slice(0, 10);

  const inRange = rows.filter((row) => {
    if (requestDate < row.effective_from) return false;
    if (row.effective_to && requestDate > row.effective_to) return false;
    return true;
  });

  const exact = inRange.filter((row) => row.model_id_pattern === modelId);
  if (exact.length > 0) {
    return pickLatest(exact);
  }

  const family = inferModelFamily(modelId);
  if (!family) return null;

  const familyRows = inRange.filter(
    (row) => row.model_family === family && row.model_id_pattern === null
  );
  if (familyRows.length > 0) {
    return pickLatest(familyRows);
  }

  return null;
}

function pickLatest(rows: EnergyCoefficient[]): EnergyCoefficient {
  return [...rows].sort((a, b) =>
    b.effective_from.localeCompare(a.effective_from)
  )[0];
}

/** Latest updated_at across coefficients for methodology disclosure. */
export function latestCoefficientUpdatedAt(
  rows: EnergyCoefficient[]
): string | null {
  if (rows.length === 0) return null;
  return rows.reduce((latest, row) => {
    const ts = row.updated_at;
    return !latest || ts > latest ? ts : latest;
  }, "" as string);
}
