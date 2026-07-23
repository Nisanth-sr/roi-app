/** Normalize to YYYY-MM for month inputs */
export function toMonthInputValue(month: string | null | undefined): string {
  if (!month) return new Date().toISOString().slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(month)) return month;
  return month.slice(0, 7);
}

/** Normalize to YYYY-MM-01 for DB queries */
export function toMonthStart(month: string | null | undefined): string {
  return `${toMonthInputValue(month)}-01`;
}
