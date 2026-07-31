import type { SupabaseClient } from "@supabase/supabase-js";
import type { EnergyCoefficient } from "@/lib/types";
import {
  computeRequestEnergy,
  findCoefficientForModel,
} from "@/modules/energy/engine";

/**
 * Recompute computed_energy_wh on existing log rows from tokens +
 * effective-dated coefficients for the request date.
 * Used by Settings → Recompute so historical uploads get energy without re-upload.
 */
export async function backfillRequestEnergy(
  supabase: SupabaseClient,
  tenantId: string,
  months?: string[]
): Promise<number> {
  const { data: coefficients, error: coeffError } = await supabase
    .from("energy_coefficients")
    .select("*");

  if (coeffError) throw coeffError;

  const coeffRows = (coefficients ?? []) as EnergyCoefficient[];

  const query = supabase
    .from("ai_request_log")
    .select(
      "id, model_id, input_tokens, output_tokens, requested_at, computed_energy_wh"
    )
    .eq("tenant_id", tenantId);

  if (months && months.length > 0) {
    // Fetch all tenant logs then filter in app — months are first-of-month strings.
    // Avoid complex OR filters; pilot volumes are small.
  }

  const { data: logs, error: logError } = await query.limit(50_000);
  if (logError) throw logError;

  const monthSet =
    months && months.length > 0
      ? new Set(months.map((m) => m.slice(0, 7)))
      : null;

  let updated = 0;

  for (const log of logs ?? []) {
    if (monthSet) {
      const logMonth = String(log.requested_at).slice(0, 7);
      if (!monthSet.has(logMonth)) continue;
    }

    const requestedAt = new Date(log.requested_at);
    const coefficient = findCoefficientForModel(
      coeffRows,
      log.model_id,
      requestedAt
    );
    if (!coefficient) continue;

    const energy = computeRequestEnergy(
      Number(log.input_tokens),
      Number(log.output_tokens),
      coefficient
    );

    if (Number(log.computed_energy_wh) === energy) continue;

    const { error } = await supabase
      .from("ai_request_log")
      .update({ computed_energy_wh: energy })
      .eq("id", log.id)
      .eq("tenant_id", tenantId);

    if (error) throw error;
    updated += 1;
  }

  return updated;
}
