export type Tenant = {
  id: string;
  name: string;
  red_flag_threshold: number;
  created_at: string;
};

export type TenantMember = {
  tenant_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
};

export type Client = {
  id: string;
  tenant_id: string;
  name: string;
  external_ref: string | null;
  created_at: string;
};

export type ModelPricing = {
  id: string;
  provider: "bedrock" | "vertex";
  model_id: string;
  input_price_per_1m: number;
  output_price_per_1m: number;
  cached_input_price_per_1m: number | null;
  effective_from: string;
  effective_to: string | null;
  verified_at: string | null;
  source_url: string | null;
  created_at: string;
};

export type EnergyCoefficient = {
  id: string;
  model_family: string;
  model_id_pattern: string | null;
  wh_per_million_tokens: number;
  overhead_factor: number;
  effective_from: string;
  effective_to: string | null;
  source_citation: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UploadBatch = {
  id: string;
  tenant_id: string;
  uploaded_by: string;
  file_type: "ai_request_log" | "client_revenue";
  row_count: number;
  error_count: number;
  uploaded_at: string;
};

export type AiRequestLog = {
  id: string;
  tenant_id: string;
  client_id: string;
  requested_at: string;
  provider: "bedrock" | "vertex";
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  computed_cost: number;
  computed_energy_wh: number;
  upload_batch_id: string;
  source: "csv" | "json";
};

export type ClientRevenue = {
  id: string;
  tenant_id: string;
  client_id: string;
  month: string;
  revenue_amount: number;
  currency: string;
  upload_batch_id: string | null;
};

export type MonthlyClientSummary = {
  tenant_id: string;
  client_id: string;
  month: string;
  total_cost: number;
  total_revenue: number;
  margin: number;
  margin_percent: number | null;
  red_flag: boolean;
  total_energy_wh: number;
  request_count: number;
  energy_wh_per_request: number | null;
  computed_at: string;
};

export type UploadRowError = {
  row: number;
  field?: string;
  message: string;
};

export type UploadResult = {
  batchId: string;
  rowCount: number;
  errorCount: number;
  errors: UploadRowError[];
  affectedMonths: string[];
};

export type DashboardClientRow = MonthlyClientSummary & {
  client_name: string;
  external_ref: string | null;
};

export type PortfolioSummary = {
  month: string;
  total_revenue: number;
  total_cost: number;
  blended_margin: number;
  blended_margin_percent: number | null;
  client_count: number;
  red_flag_count: number;
  total_energy_wh: number;
  request_count: number;
  energy_wh_per_request: number | null;
};
