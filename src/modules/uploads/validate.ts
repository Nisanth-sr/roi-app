import type { Client, ModelPricing, UploadRowError } from "@/lib/types";
import {
  computeRequestCost,
  findPricingForDate,
  inferProvider,
  monthStart,
} from "@/modules/pricing/engine";
import { mapLogRow, mapRevenueRow } from "@/modules/uploads/parser";

export type ValidatedLogRow = {
  clientId: string;
  requestedAt: string;
  provider: "bedrock" | "vertex";
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  computedCost: number;
  month: string;
};

export type ValidatedRevenueRow = {
  clientId: string;
  month: string;
  revenueAmount: number;
  currency: string;
};

export function resolveClientId(
  ref: string,
  clients: Client[]
): string | null {
  const trimmed = ref.trim();
  const byExternal = clients.find((c) => c.external_ref === trimmed);
  if (byExternal) return byExternal.id;
  const byId = clients.find((c) => c.id === trimmed);
  if (byId) return byId.id;
  const byName = clients.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );
  return byName?.id ?? null;
}

export function validateLogRows(
  rawRows: Record<string, string>[],
  clients: Client[],
  pricingRows: ModelPricing[]
): { valid: ValidatedLogRow[]; errors: UploadRowError[] } {
  const valid: ValidatedLogRow[] = [];
  const errors: UploadRowError[] = [];

  rawRows.forEach((raw, index) => {
    const rowNum = index + 2; // header + 1-based
    const row = mapLogRow(raw);

    if (!row.client_id) {
      errors.push({ row: rowNum, field: "client_id", message: "Missing client_id" });
      return;
    }

    const clientId = resolveClientId(row.client_id, clients);
    if (!clientId) {
      errors.push({
        row: rowNum,
        field: "client_id",
        message: `Unknown client: ${row.client_id}`,
      });
      return;
    }

    if (!row.request_timestamp) {
      errors.push({
        row: rowNum,
        field: "request_timestamp",
        message: "Missing request_timestamp",
      });
      return;
    }

    const requestedAt = new Date(row.request_timestamp);
    if (Number.isNaN(requestedAt.getTime())) {
      errors.push({
        row: rowNum,
        field: "request_timestamp",
        message: "Invalid timestamp",
      });
      return;
    }

    if (!row.model_id) {
      errors.push({ row: rowNum, field: "model_id", message: "Missing model_id" });
      return;
    }

    const inputTokens = parseInt(row.input_tokens ?? "", 10);
    const outputTokens = parseInt(row.output_tokens ?? "", 10);

    if (!Number.isInteger(inputTokens) || inputTokens < 0) {
      errors.push({
        row: rowNum,
        field: "input_tokens",
        message: "input_tokens must be a non-negative integer",
      });
      return;
    }

    if (!Number.isInteger(outputTokens) || outputTokens < 0) {
      errors.push({
        row: rowNum,
        field: "output_tokens",
        message: "output_tokens must be a non-negative integer",
      });
      return;
    }

    const pricing = findPricingForDate(
      pricingRows,
      row.model_id,
      requestedAt
    );

    if (!pricing) {
      errors.push({
        row: rowNum,
        field: "model_id",
        message: `No pricing for model ${row.model_id} at ${requestedAt.toISOString()}`,
      });
      return;
    }

    const provider =
      row.provider === "bedrock" || row.provider === "vertex"
        ? row.provider
        : inferProvider(row.model_id);

    valid.push({
      clientId,
      requestedAt: requestedAt.toISOString(),
      provider,
      modelId: row.model_id,
      inputTokens,
      outputTokens,
      computedCost: computeRequestCost(inputTokens, outputTokens, pricing),
      month: monthStart(requestedAt),
    });
  });

  return { valid, errors };
}

export function validateRevenueRows(
  rawRows: Record<string, string>[],
  clients: Client[]
): { valid: ValidatedRevenueRow[]; errors: UploadRowError[] } {
  const valid: ValidatedRevenueRow[] = [];
  const errors: UploadRowError[] = [];

  rawRows.forEach((raw, index) => {
    const rowNum = index + 2;
    const row = mapRevenueRow(raw);

    if (!row.client_id) {
      errors.push({ row: rowNum, field: "client_id", message: "Missing client_id" });
      return;
    }

    const clientId = resolveClientId(row.client_id, clients);
    if (!clientId) {
      errors.push({
        row: rowNum,
        field: "client_id",
        message: `Unknown client: ${row.client_id}`,
      });
      return;
    }

    const amount = parseFloat(row.revenue_amount ?? "");
    if (Number.isNaN(amount) || amount < 0) {
      errors.push({
        row: rowNum,
        field: "revenue_amount",
        message: "revenue_amount must be a non-negative number",
      });
      return;
    }

    let month = row.period_month;
    if (!month) {
      errors.push({
        row: rowNum,
        field: "period_month",
        message: "Missing period_month",
      });
      return;
    }

    if (/^\d{4}-\d{2}$/.test(month)) month = `${month}-01`;
    const monthDate = new Date(month);
    if (Number.isNaN(monthDate.getTime())) {
      errors.push({
        row: rowNum,
        field: "period_month",
        message: "Invalid period_month",
      });
      return;
    }

    valid.push({
      clientId,
      month: monthStart(monthDate),
      revenueAmount: amount,
      currency: (row.currency || "USD").toUpperCase(),
    });
  });

  return { valid, errors };
}
