import type { ModelPricing } from "@/lib/types";

/**
 * Prices a request from input/output token counts.
 * `cached_input_price_per_1m` is stored on model_pricing for future use but
 * unused in MVP — Path B uploads do not include cached-token counts.
 */
export function computeRequestCost(
  inputTokens: number,
  outputTokens: number,
  pricing: Pick<
    ModelPricing,
    "input_price_per_1m" | "output_price_per_1m"
  >
): number {
  const inputCost =
    (inputTokens * Number(pricing.input_price_per_1m)) / 1_000_000;
  const outputCost =
    (outputTokens * Number(pricing.output_price_per_1m)) / 1_000_000;
  return roundCost(inputCost + outputCost);
}

export function roundCost(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}

export function findPricingForDate(
  rows: ModelPricing[],
  modelId: string,
  requestedAt: Date
): ModelPricing | null {
  const requestDate = requestedAt.toISOString().slice(0, 10);

  const matches = rows.filter((row) => {
    if (row.model_id !== modelId) return false;
    const from = row.effective_from;
    const to = row.effective_to;
    if (requestDate < from) return false;
    if (to && requestDate > to) return false;
    return true;
  });

  if (matches.length === 0) return null;

  return matches.sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
}

export function inferProvider(modelId: string): "bedrock" | "vertex" {
  const id = modelId.toLowerCase();
  if (id.includes("claude") || id.includes("bedrock")) return "bedrock";
  if (id.includes("gemini") || id.includes("vertex")) return "vertex";
  // Default heuristic: claude-* → bedrock, gemini-* → vertex
  if (id.startsWith("claude")) return "bedrock";
  return "vertex";
}

export function computeMargin(
  revenue: number,
  cost: number
): { margin: number; marginPercent: number | null } {
  const margin = roundMoney(revenue - cost);
  const marginPercent =
    revenue > 0 ? roundMoney((margin / revenue) * 100) : null;
  return { margin, marginPercent };
}

export function evaluateRedFlag(
  revenue: number,
  cost: number,
  threshold: number
): boolean {
  if (revenue <= 0 && cost > 0) return true;
  if (revenue <= 0) return false;
  const { marginPercent } = computeMargin(revenue, cost);
  return marginPercent !== null && marginPercent < threshold;
}

export function roundMoney(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

export function monthStart(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
