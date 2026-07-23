"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toMonthInputValue } from "@/lib/month";

export function MonthPicker({
  label = "Period",
}: {
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = toMonthInputValue(searchParams.get("month"));

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
      <span>{label}</span>
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-black"
      />
    </label>
  );
}
