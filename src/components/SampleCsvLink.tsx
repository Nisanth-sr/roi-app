/** Static sample CSV under /public/samples — download then fill and upload. */
export function SampleCsvLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const filename = href.split("/").pop() ?? "sample.csv";
  return (
    <a
      href={href}
      download={filename}
      className="font-medium text-black underline"
    >
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
    items.push({
      href: "/samples/sample-clients.csv",
      label: "clients CSV",
    });
  }
  if (logs) {
    items.push({
      href: "/samples/sample-logs.csv",
      label: "logs CSV",
    });
  }
  if (revenue) {
    items.push({
      href: "/samples/sample-revenue.csv",
      label: "revenue CSV",
    });
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
      . Fill in your rows, then upload. Keep{" "}
      <code className="text-xs">client_id</code> /{" "}
      <code className="text-xs">external_ref</code> the same across files.
    </p>
  );
}
