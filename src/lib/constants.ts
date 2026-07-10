export const DEFAULT_RED_FLAG_THRESHOLD = Number(
  process.env.DEFAULT_RED_FLAG_THRESHOLD ?? 20
);

export const PROVIDERS = ["bedrock", "vertex"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const TENANT_ROLES = ["owner", "member"] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

export const UPLOAD_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 10,
} as const;
