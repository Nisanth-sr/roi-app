"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toMonthInputValue } from "@/lib/month";

export function MonthPicker({
  label = "Period",
  availableMonths = [],
}: {
  label?: string;
  availableMonths?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = toMonthInputValue(searchParams.get("month"));

  const months =
    availableMonths.length > 0
      ? [...new Set(availableMonths)].sort((a, b) => b.localeCompare(a))
      : [];

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  function shift(delta: number) {
    if (months.length === 0) return;
    const idx = months.indexOf(value);
    const from = idx >= 0 ? idx : 0;
    const next = months[Math.min(months.length - 1, Math.max(0, from - delta))];
    if (next && next !== value) onChange(next);
  }

  if (months.length > 0) {
    const atNewest = months.indexOf(value) <= 0;
    const atOldest = months.indexOf(value) === months.length - 1;

    return (
      <div className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <span>{label}</span>
        <button
          type="button"
          className="brand-btn-ghost px-2 py-1.5 disabled:opacity-40"
          disabled={atOldest}
          aria-label="Previous period"
          onClick={() => shift(-1)}
        >
          ‹
        </button>
        <select
          value={months.includes(value) ? value : months[0]}
          onChange={(e) => onChange(e.target.value)}
          className="cursor-pointer rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-black"
          aria-label={label}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="brand-btn-ghost px-2 py-1.5 disabled:opacity-40"
          disabled={atNewest}
          aria-label="Next period"
          onClick={() => shift(1)}
        >
          ›
        </button>
      </div>
    );
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
      <span>{label}</span>
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-black"
      />
    </label>
  );
}
