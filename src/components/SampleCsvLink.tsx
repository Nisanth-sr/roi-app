/**
 * Sample CSVs are generated per tenant by /api/samples/[type] so the rows use
 * the workspace's declared models and real client refs.
 */
export function sampleCsvHref(type: "clients" | "logs" | "revenue"): string {
  return `/api/samples/${type}`;
}

export function SampleCsvLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a href={href} className="font-medium text-black underline">
      {label}
    </a>
  );
}

export function SampleCsvLinks({
  clients = false,
  logs = false,
  revenue = false,
}: {
  clients?: boolean;
  logs?: boolean;
  revenue?: boolean;
}) {
  const items: { href: string; label: string }[] = [];
  if (clients) {
    items.push({ href: sampleCsvHref("clients"), label: "clients CSV" });
  }
  if (logs) {
    items.push({ href: sampleCsvHref("logs"), label: "logs CSV" });
  }
  if (revenue) {
    items.push({ href: sampleCsvHref("revenue"), label: "revenue CSV" });
  }

  if (items.length === 0) return null;

  return (
    <p className="mt-2 text-sm text-[var(--muted)]">
      Download sample format:{" "}
      {items.map((item, i) => (
        <span key={item.href}>
          {i > 0 && " · "}
          <SampleCsvLink href={item.href} label={item.label} />
        </span>
      ))}
      . Pre-filled with your clients and models — replace the numbers, then
      upload. Keep <code className="text-xs">client_id</code> /{" "}
      <code className="text-xs">external_ref</code> the same across files.
    </p>
  );
}
