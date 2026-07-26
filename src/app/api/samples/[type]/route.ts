import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { AI_MODEL_VALUES } from "@/lib/onboarding-options";
import { createClient } from "@/lib/supabase/server";

const SAMPLE_TYPES = ["logs", "revenue", "clients"] as const;
type SampleType = (typeof SAMPLE_TYPES)[number];

const FALLBACK_REFS = ["client-a", "client-b", "client-c"];
const TOKEN_PRESETS = [
  { input: 50_000, output: 30_000 },
  { input: 800_000, output: 200_000 },
  { input: 5_000_000, output: 500_000 },
];

function isSampleType(value: string): value is SampleType {
  return (SAMPLE_TYPES as readonly string[]).includes(value);
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

/** Day N of the current month, so sample rows land in a month the user can see. */
function sampleTimestamp(day: number): string {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 10, 0, 0)
  );
  return date.toISOString().replace(".000", "");
}

function currentPeriodMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  if (!isSampleType(type)) {
    return NextResponse.json({ error: "Unknown sample type" }, { status: 404 });
  }

  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("name, external_ref")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: true })
    .limit(3);

  const refs =
    clients && clients.length > 0
      ? clients.map((c, i) => c.external_ref?.trim() || FALLBACK_REFS[i] || `client-${i + 1}`)
      : FALLBACK_REFS;

  const csv =
    type === "logs"
      ? buildLogsCsv(refs, ctx.tenant.ai_model_ids ?? [])
      : type === "revenue"
        ? buildRevenueCsv(refs)
        : buildClientsCsv();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sample-${type}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * One row per declared model. Models declared as free-text "other" are left out
 * because they have no model_pricing row and would fail upload validation.
 */
function buildLogsCsv(refs: string[], declaredModels: string[]): string {
  const models = declaredModels.filter((m) =>
    (AI_MODEL_VALUES as readonly string[]).includes(m)
  );
  const usable = models.length > 0 ? models : ["claude-sonnet-4-6"];

  const rows = usable.map((modelId, i) => {
    const preset = TOKEN_PRESETS[i % TOKEN_PRESETS.length];
    return [
      refs[i % refs.length],
      sampleTimestamp((i % 27) + 1),
      modelId,
      String(preset.input),
      String(preset.output),
    ];
  });

  return toCsv(
    [
      "client_id",
      "request_timestamp",
      "model_id",
      "input_tokens",
      "output_tokens",
    ],
    rows
  );
}

function buildRevenueCsv(refs: string[]): string {
  const month = currentPeriodMonth();
  const rows = refs.map((ref) => [ref, "1000", "USD", month]);
  return toCsv(
    ["client_id", "revenue_amount", "currency", "period_month"],
    rows
  );
}

/** Kept as blank examples — echoing existing clients back would only produce
 * duplicate external_ref errors on re-upload. */
function buildClientsCsv(): string {
  return toCsv(
    ["name", "external_ref"],
    [
      ["Client A", "client-a"],
      ["Client B", "client-b"],
      ["Client C", "client-c"],
    ]
  );
}
