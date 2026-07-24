import { Spinner } from "@/components/Spinner";

/** Full-panel placeholder while page data is loading. */
export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="brand-panel flex min-h-[12rem] items-center justify-center gap-3 p-12 text-sm text-[var(--muted)]">
      <Spinner />
      {label}
    </div>
  );
}
