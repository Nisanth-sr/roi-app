import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { runRollupForMonths } from "@/modules/rollup/compute";
import { parseUploadFile, readUploadText } from "@/modules/uploads/parser";
import { validateRevenueRows } from "@/modules/uploads/validate";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit(`upload-revenue:${ctx.userId}`);
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

  const content = await readUploadText(file);
  const parsed = parseUploadFile(content, file.name);
  const { valid, errors } = validateRevenueRows(parsed.rows, clients ?? []);

  const { data: batch, error: batchError } = await supabase
    .from("upload_batches")
    .insert({
      tenant_id: ctx.tenantId,
      uploaded_by: ctx.userId,
      file_type: "client_revenue",
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

  for (const row of valid) {
    const { error } = await supabase.from("client_revenue").upsert(
      {
        tenant_id: ctx.tenantId,
        client_id: row.clientId,
        month: row.month,
        revenue_amount: row.revenueAmount,
        currency: row.currency,
        upload_batch_id: batch.id,
      },
      { onConflict: "tenant_id,client_id,month" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
