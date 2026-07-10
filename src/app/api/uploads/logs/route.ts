import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { runRollupForMonths } from "@/modules/rollup/compute";
import { parseUploadFile, readUploadText } from "@/modules/uploads/parser";
import { validateLogRows } from "@/modules/uploads/validate";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit(`upload-logs:${ctx.userId}`);
  if (limited) return limited;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", ctx.tenantId);

  const { data: pricingRows } = await supabase.from("model_pricing").select("*");

  const content = await readUploadText(file);
  const parsed = parseUploadFile(content, file.name);
  const { valid, errors } = validateLogRows(
    parsed.rows,
    clients ?? [],
    pricingRows ?? []
  );

  const { data: batch, error: batchError } = await supabase
    .from("upload_batches")
    .insert({
      tenant_id: ctx.tenantId,
      uploaded_by: ctx.userId,
      file_type: "ai_request_log",
      row_count: valid.length,
      error_count: errors.length,
    })
    .select()
    .single();

  if (batchError || !batch) {
    return NextResponse.json(
      { error: batchError?.message ?? "Failed to create batch" },
      { status: 500 }
    );
  }

  if (valid.length > 0) {
    const inserts = valid.map((row) => ({
      tenant_id: ctx.tenantId,
      client_id: row.clientId,
      requested_at: row.requestedAt,
      provider: row.provider,
      model_id: row.modelId,
      input_tokens: row.inputTokens,
      output_tokens: row.outputTokens,
      computed_cost: row.computedCost,
      upload_batch_id: batch.id,
      source: parsed.format,
    }));

    const { error: insertError } = await supabase
      .from("ai_request_log")
      .insert(inserts);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const affectedMonths = [...new Set(valid.map((r) => r.month))];

  if (affectedMonths.length > 0) {
    await runRollupForMonths(
      supabase,
      ctx.tenantId,
      affectedMonths,
      ctx.tenant.red_flag_threshold
    );
  }

  return NextResponse.json({
    batchId: batch.id,
    rowCount: valid.length,
    errorCount: errors.length,
    errors,
    affectedMonths,
  });
}
