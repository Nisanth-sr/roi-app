import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { paymentGatewayLabel } from "@/lib/onboarding-options";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Client, GatewayImportSummary, UploadRowError } from "@/lib/types";
import { runRollupForMonths } from "@/modules/rollup/compute";
import {
  aggregateGatewayRows,
  detectAdapter,
  type GatewayAdapter,
} from "@/modules/uploads/gateways";
import { parseUploadFile, readUploadText } from "@/modules/uploads/parser";
import {
  resolveClientIdFromCandidates,
  validateRevenueRows,
} from "@/modules/uploads/validate";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit(`upload-revenue:${ctx.userId}`);
  if (limited) return limited;

  const formData = await request.formData();
  const file = formData.get("file");
  const createMissingClients = formData.get("createMissingClients") !== "false";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: clientRows } = await supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", ctx.tenantId);

  const clients: Client[] = clientRows ?? [];

  const content = await readUploadText(file);
  const parsed = parseUploadFile(content, file.name);

  const adapter = detectAdapter(
    Object.keys(parsed.rows[0] ?? {}),
    ctx.tenant.payment_gateway
  );

  let rowsToValidate = parsed.rows;
  const preErrors: UploadRowError[] = [];
  let gateway: GatewayImportSummary | undefined;

  if (adapter) {
    const adapted = await adaptGatewayRows({
      adapter,
      rawRows: parsed.rows,
      clients,
      createMissingClients,
      tenantId: ctx.tenantId,
      supabase,
    });

    if (adapted.error) {
      return NextResponse.json({ error: adapted.error }, { status: 500 });
    }

    rowsToValidate = adapted.rows;
    preErrors.push(...adapted.errors);
    gateway = {
      id: adapter.id,
      label: adapter.label,
      amountUnit: adapter.amountUnit,
      sourceRowCount: parsed.rows.length,
      aggregatedRowCount: adapted.rows.length,
      skippedRowCount: adapted.skippedRows,
      totalAmount: adapted.totalAmount,
      currencies: adapted.currencies,
      createdClients: adapted.createdClients,
      declaredGatewayMismatch:
        ctx.tenant.payment_gateway && ctx.tenant.payment_gateway !== adapter.id
          ? paymentGatewayLabel(ctx.tenant.payment_gateway)
          : null,
    };
  }

  const { valid, errors: validationErrors } = validateRevenueRows(
    rowsToValidate,
    clients
  );
  const errors = [...preErrors, ...validationErrors];

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
    gateway,
  });
}

type AdaptArgs = {
  adapter: GatewayAdapter;
  rawRows: Record<string, string>[];
  /** Mutated in place so newly created clients resolve during validation. */
  clients: Client[];
  createMissingClients: boolean;
  tenantId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Turns a native gateway export into internal revenue rows keyed by client id,
 * creating clients for customers that are not on the books yet.
 */
async function adaptGatewayRows({
  adapter,
  rawRows,
  clients,
  createMissingClients,
  tenantId,
  supabase,
}: AdaptArgs): Promise<{
  rows: Record<string, string>[];
  errors: UploadRowError[];
  skippedRows: number;
  totalAmount: number;
  currencies: string[];
  createdClients: string[];
  error?: string;
}> {
  const aggregated = aggregateGatewayRows(rawRows, adapter);
  const errors = [...aggregated.errors];
  const createdClients: string[] = [];

  const unresolved = aggregated.rows.filter(
    (row) => !resolveClientIdFromCandidates(row.candidateRefs, clients)
  );

  if (unresolved.length > 0 && createMissingClients) {
    const byRef = new Map<string, { name: string; ref: string }>();
    for (const row of unresolved) {
      const ref = row.candidateRefs[0];
      if (!byRef.has(ref.toLowerCase())) {
        byRef.set(ref.toLowerCase(), { name: row.displayName, ref });
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("clients")
      .insert(
        [...byRef.values()].map((c) => ({
          tenant_id: tenantId,
          name: c.name,
          external_ref: c.ref,
        }))
      )
      .select("*");

    if (insertError) {
      return {
        rows: [],
        errors,
        skippedRows: aggregated.skippedRows,
        totalAmount: aggregated.totalAmount,
        currencies: [],
        createdClients: [],
        error: `Failed to create clients from the export: ${insertError.message}`,
      };
    }

    for (const client of inserted ?? []) {
      clients.push(client as Client);
      createdClients.push((client as Client).name);
    }
  }

  const rows: Record<string, string>[] = [];
  const currencies = new Set<string>();

  for (const row of aggregated.rows) {
    const clientId = resolveClientIdFromCandidates(row.candidateRefs, clients);

    if (!clientId) {
      errors.push({
        row: 0,
        field: "client_id",
        message: `Unknown customer: ${row.displayName} (${row.candidateRefs[0]}). Enable "Create missing clients" or add them on the Clients page.`,
      });
      continue;
    }

    currencies.add(row.currency);
    rows.push({
      client_id: clientId,
      revenue_amount: String(row.amount),
      currency: row.currency,
      period_month: row.periodMonth,
    });
  }

  return {
    rows,
    errors,
    skippedRows: aggregated.skippedRows,
    totalAmount: aggregated.totalAmount,
    currencies: [...currencies].sort(),
    createdClients,
  };
}
