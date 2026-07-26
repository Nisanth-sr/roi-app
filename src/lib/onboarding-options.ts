export const PAYMENT_GATEWAYS = [
  { value: "stripe", label: "Stripe" },
  { value: "paddle", label: "Paddle" },
  { value: "chargebee", label: "Chargebee" },
  { value: "lemon_squeezy", label: "Lemon Squeezy" },
  { value: "other", label: "Other" },
] as const;

export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number]["value"];

export const PAYMENT_GATEWAY_VALUES = PAYMENT_GATEWAYS.map((g) => g.value);

export function isPaymentGateway(value: unknown): value is PaymentGateway {
  return (
    typeof value === "string" &&
    (PAYMENT_GATEWAY_VALUES as readonly string[]).includes(value)
  );
}

export function paymentGatewayLabel(value: string | null): string {
  if (!value) return "—";
  return PAYMENT_GATEWAYS.find((g) => g.value === value)?.label ?? value;
}

/** Mirrors the seeded model_pricing ids — declared usage only, not a pricing gate. */
export const AI_MODEL_OPTIONS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "bedrock" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6", provider: "bedrock" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "bedrock" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "vertex" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "vertex" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "vertex" },
] as const;

export const AI_MODEL_VALUES = AI_MODEL_OPTIONS.map((m) => m.value);

export function isKnownAiModel(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (AI_MODEL_VALUES as readonly string[]).includes(value)
  );
}

export function aiModelLabel(value: string): string {
  return AI_MODEL_OPTIONS.find((m) => m.value === value)?.label ?? value;
}

export type TenantProfile = {
  payment_gateway: PaymentGateway | null;
  payment_gateway_other: string | null;
  ai_model_ids: string[];
  ai_models_other: string[];
  onboarding_completed_at: string | null;
};

/** Complete when a gateway is chosen (named if "other") and at least one model declared. */
export function isProfileComplete(profile: {
  payment_gateway?: string | null;
  payment_gateway_other?: string | null;
  ai_model_ids?: string[] | null;
  ai_models_other?: string[] | null;
}): boolean {
  const gateway = profile.payment_gateway;
  if (!isPaymentGateway(gateway)) return false;
  if (gateway === "other" && !profile.payment_gateway_other?.trim()) {
    return false;
  }
  const modelCount =
    (profile.ai_model_ids?.length ?? 0) + (profile.ai_models_other?.length ?? 0);
  return modelCount > 0;
}
