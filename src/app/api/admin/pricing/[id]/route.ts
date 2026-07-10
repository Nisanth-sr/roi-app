import { NextResponse } from "next/server";
import { requireOwner, isErrorResponse } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireOwner();
  if (isErrorResponse(ctx)) return ctx;

  const { id } = await params;
  const body = (await request.json()) as {
    action?: "close" | "update";
    effective_to?: string;
    input_price_per_1m?: number;
    output_price_per_1m?: number;
    verified_at?: string;
    source_url?: string;
    new_row?: {
      input_price_per_1m: number;
      output_price_per_1m: number;
      effective_from: string;
      source_url?: string;
    };
  };

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("model_pricing")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Pricing row not found" }, { status: 404 });
  }

  if (body.action === "close" || body.effective_to) {
    const { data, error } = await supabase
      .from("model_pricing")
      .update({ effective_to: body.effective_to ?? new Date().toISOString().slice(0, 10) })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("pricing_audit_log").insert({
      pricing_id: id,
      user_id: ctx.userId,
      action: "close",
      changes: { effective_to: body.effective_to },
    });

    if (body.new_row) {
      const { data: created, error: createError } = await supabase
        .from("model_pricing")
        .insert({
          provider: existing.provider,
          model_id: existing.model_id,
          input_price_per_1m: body.new_row.input_price_per_1m,
          output_price_per_1m: body.new_row.output_price_per_1m,
          effective_from: body.new_row.effective_from,
          verified_at: new Date().toISOString(),
          source_url: body.new_row.source_url ?? existing.source_url,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      await supabase.from("pricing_audit_log").insert({
        pricing_id: created.id,
        user_id: ctx.userId,
        action: "create_replacement",
        changes: body.new_row,
      });

      return NextResponse.json({ closed: data, created });
    }

    return NextResponse.json({ pricing: data });
  }

  const { data, error } = await supabase
    .from("model_pricing")
    .update({
      input_price_per_1m: body.input_price_per_1m,
      output_price_per_1m: body.output_price_per_1m,
      verified_at: body.verified_at ?? new Date().toISOString(),
      source_url: body.source_url,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("pricing_audit_log").insert({
    pricing_id: id,
    user_id: ctx.userId,
    action: "update",
    changes: body,
  });

  return NextResponse.json({ pricing: data });
}
