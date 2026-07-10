import { NextResponse } from "next/server";
import { requireOwner, isErrorResponse } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const ctx = await requireOwner();
  if (isErrorResponse(ctx)) return ctx;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("model_pricing")
    .select("*")
    .order("model_id")
    .order("effective_from", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pricing: data });
}

export async function POST(request: Request) {
  const ctx = await requireOwner();
  if (isErrorResponse(ctx)) return ctx;

  const body = (await request.json()) as {
    provider?: string;
    model_id?: string;
    input_price_per_1m?: number;
    output_price_per_1m?: number;
    effective_from?: string;
    source_url?: string;
  };

  if (
    !body.provider ||
    !body.model_id ||
    body.input_price_per_1m === undefined ||
    body.output_price_per_1m === undefined ||
    !body.effective_from
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("model_pricing")
    .insert({
      provider: body.provider,
      model_id: body.model_id,
      input_price_per_1m: body.input_price_per_1m,
      output_price_per_1m: body.output_price_per_1m,
      effective_from: body.effective_from,
      verified_at: new Date().toISOString(),
      source_url: body.source_url ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("pricing_audit_log").insert({
    pricing_id: data.id,
    user_id: ctx.userId,
    action: "create",
    changes: body,
  });

  return NextResponse.json({ pricing: data }, { status: 201 });
}
