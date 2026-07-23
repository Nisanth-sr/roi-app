import Papa from "papaparse";

export type ParsedFile = {
  rows: Record<string, string>[];
  format: "csv" | "json";
};

const LOG_HEADER_ALIASES: Record<string, string[]> = {
  client_id: ["client_id", "clientid", "client", "external_ref", "external_id"],
  request_timestamp: [
    "request_timestamp",
    "timestamp",
    "requested_at",
    "date",
    "time",
  ],
  model_id: ["model_id", "model", "model_name"],
  input_tokens: ["input_tokens", "input", "prompt_tokens"],
  output_tokens: ["output_tokens", "output", "completion_tokens"],
  provider: ["provider"],
};

const REVENUE_HEADER_ALIASES: Record<string, string[]> = {
  client_id: ["client_id", "clientid", "client", "external_ref", "external_id"],
  revenue_amount: ["revenue_amount", "revenue", "amount", "mrr"],
  currency: ["currency"],
  period_month: ["period_month", "month", "period"],
};

const CLIENT_HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "client_name", "company"],
  external_ref: [
    "external_ref",
    "client_id",
    "external_id",
    "ref",
    "clientid",
  ],
};

export function parseUploadFile(
  content: string,
  filename: string
): ParsedFile {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) {
    const parsed = JSON.parse(content) as unknown;
    const rows = Array.isArray(parsed)
      ? parsed.map((item) => normalizeRecord(item))
      : [normalizeRecord(parsed)];
    return { rows, format: "json" };
  }

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  return { rows: result.data, format: "csv" };
}

function normalizeRecord(item: unknown): Record<string, string> {
  if (typeof item !== "object" || item === null) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(item)) {
    out[key.toLowerCase()] =
      value === null || value === undefined ? "" : String(value);
  }
  return out;
}

export function mapRow(
  row: Record<string, string>,
  aliases: Record<string, string[]>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  const keys = Object.keys(row);

  for (const [canonical, options] of Object.entries(aliases)) {
    const match = keys.find((k) =>
      options.some((opt) => opt.toLowerCase() === k.toLowerCase())
    );
    if (match) mapped[canonical] = row[match]?.trim() ?? "";
  }

  return mapped;
}

export function mapLogRow(row: Record<string, string>) {
  return mapRow(row, LOG_HEADER_ALIASES);
}

export function mapRevenueRow(row: Record<string, string>) {
  return mapRow(row, REVENUE_HEADER_ALIASES);
}

export function mapClientRow(row: Record<string, string>) {
  return mapRow(row, CLIENT_HEADER_ALIASES);
}

export async function readUploadText(file: File): Promise<string> {
  return file.text();
}
