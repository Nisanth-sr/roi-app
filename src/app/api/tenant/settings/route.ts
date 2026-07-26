import { NextResponse } from "next/server";
import { getAuthContext, requireOwner, isErrorResponse } from "@/lib/api/auth";
import {
  isKnownAiModel,
  isPaymentGateway,
  isProfileComplete,
} from "@/lib/onboarding-options";
import { createClient } from "@/lib/supabase/server";

const TENANT_FIELDS =
  "id, name, red_flag_threshold, payment_gateway, payment_gateway_other, ai_model_ids, ai_models_other, onboarding_completed_at";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    tenant: {
      id: ctx.tenant.id,
      name: ctx.tenant.name,
      red_flag_threshold: Number(ctx.tenant.red_flag_threshold),
      payment_gateway: ctx.tenant.payment_gateway ?? null,
      payment_gateway_other: ctx.tenant.payment_gateway_other ?? null,
      ai_model_ids: ctx.tenant.ai_model_ids ?? [],
      ai_models_other: ctx.tenant.ai_models_other ?? [],
      onboarding_completed_at: ctx.tenant.onboarding_completed_at ?? null,
    },
    role: ctx.role,
  });
}

function normalizeStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return [...new Set(cleaned)];
}

export async function PATCH(request: Request) {
  const ctx = await requireOwner();
  if (isErrorResponse(ctx)) return ctx;

  const body = (await request.json()) as {
    red_flag_threshold?: number;
    name?: string;
    payment_gateway?: string | null;
    payment_gateway_other?: string | null;
    ai_model_ids?: string[];
    ai_models_other?: string[];
  };

  const updates: Record<string, unknown> = {};

  if (body.red_flag_threshold !== undefined) {
    const threshold = Number(body.red_flag_threshold);
    if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
      return NextResponse.json(
        { error: "red_flag_threshold must be between 0 and 100" },
        { status: 400 }
      );
    }
    updates.red_flag_threshold = threshold;
  }

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    updates.name = name;
  }

  if (body.payment_gateway !== undefined) {
    if (body.payment_gateway === null) {
      updates.payment_gateway = null;
      updates.payment_gateway_other = null;
    } else if (!isPaymentGateway(body.payment_gateway)) {
      return NextResponse.json(
        { error: "Unsupported payment_gateway" },
        { status: 400 }
      );
    } else {
      updates.payment_gateway = body.payment_gateway;
    }
  }

  if (body.payment_gateway_other !== undefined) {
    updates.payment_gateway_other = body.payment_gateway_other?.trim() || null;
  }

  // "Other" gateway needs a name; a named gateway clears any stale free text
  const nextGateway =
    (updates.payment_gateway as string | null | undefined) ??
    ctx.tenant.payment_gateway ??
    null;

  if (nextGateway === "other") {
    const otherName =
      (updates.payment_gateway_other as string | null | undefined) ??
      ctx.tenant.payment_gateway_other ??
      null;
    if (!otherName) {
      return NextResponse.json(
        { error: "Tell us which payment gateway you use" },
        { status: 400 }
      );
    }
  } else if (nextGateway) {
    updates.payment_gateway_other = null;
  }

  if (body.ai_model_ids !== undefined) {
    const models = normalizeStringList(body.ai_model_ids);
    if (!models) {
      return NextResponse.json(
        { error: "ai_model_ids must be an array of model ids" },
        { status: 400 }
      );
    }
    const unknown = models.filter((m) => !isKnownAiModel(m));
    if (unknown.length > 0) {
      return NextResponse.json(
        { error: `Unknown model id: ${unknown.join(", ")}` },
        { status: 400 }
      );
    }
    updates.ai_model_ids = models;
  }

  if (body.ai_models_other !== undefined) {
    const models = normalizeStringList(body.ai_models_other);
    if (!models) {
      return NextResponse.json(
        { error: "ai_models_other must be an array of model names" },
        { status: 400 }
      );
    }
    updates.ai_models_other = models;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const merged = {
    payment_gateway: nextGateway,
    payment_gateway_other:
      (updates.payment_gateway_other as string | null | undefined) ??
      ctx.tenant.payment_gateway_other ??
      null,
    ai_model_ids:
      (updates.ai_model_ids as string[] | undefined) ??
      ctx.tenant.ai_model_ids ??
      [],
    ai_models_other:
      (updates.ai_models_other as string[] | undefined) ??
      ctx.tenant.ai_models_other ??
      [],
  };

  if (!ctx.tenant.onboarding_completed_at && isProfileComplete(merged)) {
    updates.onboarding_completed_at = new Date().toISOString();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .update(updates)
    .eq("id", ctx.tenantId)
    .select(TENANT_FIELDS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tenant: data });
}
