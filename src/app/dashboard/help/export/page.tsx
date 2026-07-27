import Link from "next/link";
import { sampleCsvHref } from "@/components/SampleCsvLink";

export default function ExportHelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <p className="text-sm text-[var(--muted)]">
          <Link href="/dashboard/upload" className="underline hover:text-black">
            ← Back to Upload
          </Link>
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-black">
          How to export revenue and AI logs
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Export two files for the <strong className="font-medium text-black">same month</strong>, then
          drop them on Upload. This app does not pull live data from Stripe,
          Paddle, Bedrock, or Vertex — you upload the files.
        </p>
      </div>

      <section className="brand-panel space-y-3 p-6">
        <h2 className="font-medium text-black">What you need</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>
            <strong className="font-medium text-black">Revenue file</strong> —
            from your payment gateway (native export) or an internal CSV.
          </li>
          <li>
            <strong className="font-medium text-black">AI request log file</strong>{" "}
            — from your application logging (client-tagged token usage), CSV or
            JSON.
          </li>
          <li>
            <strong className="font-medium text-black">Matching client ids</strong>{" "}
            — log <code className="text-xs">client_id</code> and gateway
            customer ids should match clients (
            <code className="text-xs">external_ref</code>, name, or id).
          </li>
          <li>
            <strong className="font-medium text-black">Token counts only</strong> —
            no prompts or completions.
          </li>
        </ol>
        <p className="text-sm text-[var(--muted)]">
          Download samples on Upload:{" "}
          <a href={sampleCsvHref("logs")} className="font-medium text-black underline">
            logs CSV
          </a>
          {" · "}
          <a href={sampleCsvHref("revenue")} className="font-medium text-black underline">
            revenue CSV
          </a>
          . Declare your gateway and models under{" "}
          <Link href="/dashboard/settings" className="font-medium text-black underline">
            Settings → Workspace profile
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-black">
          1. Payment gateway exports (revenue)
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Upload a raw Stripe, Paddle, Chargebee, or Lemon Squeezy export — no
          reformatting. Settled rows become one revenue figure per client per
          month. Missing customers can be created automatically (toggle on the
          upload card).
        </p>

        <GatewayBlock
          title="Stripe"
          steps={[
            "Open Stripe Dashboard → Payments.",
            "Filter to the month you care about.",
            "Export the payments CSV.",
            "Upload under Upload → Client revenue.",
          ]}
          howWeRead="Amounts are major units (dollars). Rows kept when paid/succeeded, captured is not false, amount > 0, and not fully refunded."
        />
        <GatewayBlock
          title="Paddle"
          steps={[
            "Open Paddle → Reports → Transactions.",
            "Generate a report; download the CSV from the email.",
            "Upload under Upload → Client revenue.",
          ]}
          howWeRead="grand_total is minor units (cents). Status must be completed, paid, or billed."
        />
        <GatewayBlock
          title="Chargebee"
          steps={[
            "Settings → Import & Export Data → Export Data → Invoices, or Logs → Transactions filtered to Success.",
            "Export, then upload under Upload → Client revenue.",
          ]}
          howWeRead="amount paid (and similar) as minor units."
        />
        <GatewayBlock
          title="Lemon Squeezy"
          steps={[
            "Orders → Export.",
            "Download the CSV emailed to the store owner.",
            "Upload under Upload → Client revenue.",
          ]}
          howWeRead="Revenue = subtotal − discount_total in minor units. Tax is excluded (merchant of record)."
        />

        <div className="brand-panel space-y-3 p-6">
          <h3 className="font-medium text-black">Internal revenue CSV (fallback)</h3>
          <p className="text-sm text-[var(--muted)]">
            Columns: <code className="text-xs">client_id</code>,{" "}
            <code className="text-xs">revenue_amount</code>,{" "}
            <code className="text-xs">currency</code>,{" "}
            <code className="text-xs">period_month</code> (aliases like{" "}
            <code className="text-xs">client</code>, <code className="text-xs">amount</code>,{" "}
            <code className="text-xs">month</code> work).
          </p>
          <h3 className="font-medium text-black">Caveats</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>
              Partial refunds / credit notes are not netted. Fully refunded
              charges are skipped.
            </li>
            <li>
              One currency per client-month — filter mixed currencies and
              re-upload.
            </li>
            <li>
              Amount units are fixed per gateway. Check the upload result panel
              for totals.
            </li>
            <li>
              Batch history and rollback:{" "}
              <Link href="/dashboard/settings" className="font-medium text-black underline">
                Settings → Recent uploads
              </Link>
              .
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-black">2. AI request logs</h2>
        <p className="text-sm text-[var(--muted)]">
          Logs must come from <strong className="font-medium text-black">your product’s request logger</strong> —
          one row per AI call, tagged with which of your clients it belongs to.
          Provider consoles (CloudWatch, Vertex usage) usually lack client tags
          and are not enough for per-client margin. There is no live Bedrock /
          Vertex connector in this MVP.
        </p>

        <div className="brand-panel overflow-x-auto p-6">
          <h3 className="font-medium text-black">Required columns</h3>
          <table className="mt-3 w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="py-2 pr-4 font-medium">Column</th>
                <th className="py-2 pr-4 font-medium">Required</th>
                <th className="py-2 font-medium">Aliases</th>
              </tr>
            </thead>
            <tbody className="text-black">
              <ColRow name="client_id" required aliases="client, external_ref, …" />
              <ColRow name="request_timestamp" required aliases="timestamp, requested_at, …" />
              <ColRow name="model_id" required aliases="model, model_name" />
              <ColRow name="input_tokens" required aliases="input, prompt_tokens" />
              <ColRow name="output_tokens" required aliases="output, completion_tokens" />
              <ColRow name="provider" required={false} aliases="bedrock or vertex" />
            </tbody>
          </table>
          <pre className="mt-4 overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-black">
            {`client_id,request_timestamp,model_id,input_tokens,output_tokens
client-a,2026-06-01T10:00:00Z,claude-sonnet-4-6,50000,30000`}
          </pre>
          <p className="mt-3 text-sm text-[var(--muted)]">
            <code className="text-xs">model_id</code> must exist under{" "}
            <Link href="/dashboard/settings" className="font-medium text-black underline">
              Settings → Model pricing
            </Link>
            . Unpriced models fail those rows.
          </p>
        </div>

        <div className="brand-panel space-y-3 p-6">
          <h3 className="font-medium text-black">How to produce the file</h3>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>
              Prefer: export from the DB or logger that already records each
              call with client_id, timestamp, model, and tokens.
            </li>
            <li>
              Map ids so log client_id equals the client’s external_ref in this
              app.
            </li>
            <li>Filter to the same calendar month as revenue.</li>
            <li>Export CSV or JSON without prompt/response bodies.</li>
            <li>
              Or download the{" "}
              <a href={sampleCsvHref("logs")} className="font-medium text-black underline">
                logs sample
              </a>{" "}
              and replace rows with your data.
            </li>
          </ol>
          <h3 className="pt-2 font-medium text-black">Provider tips</h3>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>
              <strong className="font-medium text-black">Bedrock:</strong>{" "}
              invocation logging helps verify tokens; still attribute each
              request to a client in your own app log.
            </li>
            <li>
              <strong className="font-medium text-black">Vertex:</strong> usage
              metrics alone are not enough — you need client_id on each request
              row.
            </li>
          </ul>
        </div>
      </section>

      <section className="brand-panel space-y-3 p-6">
        <h2 className="font-medium text-black">3. Upload and verify</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>
            Go to{" "}
            <Link href="/dashboard/upload" className="font-medium text-black underline">
              Upload
            </Link>
            .
          </li>
          <li>Upload Client revenue, then AI request logs (either order is fine).</li>
          <li>
            Read the result panel — download the errors CSV if rows failed.
          </li>
          <li>
            Open{" "}
            <Link href="/dashboard" className="font-medium text-black underline">
              Overview
            </Link>
            , pick the month, confirm margins.
          </li>
          <li>
            Wrong batch? Owner rollback under Settings → Recent uploads.
          </li>
        </ol>
      </section>

      <section className="brand-panel overflow-x-auto p-6">
        <h2 className="font-medium text-black">4. Troubleshooting</h2>
        <table className="mt-3 w-full min-w-[28rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted)]">
              <th className="py-2 pr-4 font-medium">Symptom</th>
              <th className="py-2 font-medium">What to do</th>
            </tr>
          </thead>
          <tbody className="text-[var(--muted)]">
            <Trouble
              symptom="No client tags on AI usage"
              fix="Per-client margin needs client_id on each request — add that logging first."
            />
            <Trouble
              symptom="Unpriced model_id"
              fix="Fix spelling or add rates under Settings → Model pricing."
            />
            <Trouble
              symptom="Gateway not detected / wrong totals"
              fix="Confirm export type, check result panel units, or use the internal revenue CSV."
            />
            <Trouble
              symptom="Currency clash"
              fix="Filter the export to one currency and re-upload."
            />
            <Trouble
              symptom="Clients not matching"
              fix="Set external_ref to the gateway customer id or billing email from the export."
            />
            <Trouble
              symptom="Margins empty for a month"
              fix="Confirm both uploads for that month; check Recent uploads; recompute from Settings if needed."
            />
          </tbody>
        </table>
      </section>

      <p className="text-sm text-[var(--muted)]">
        <Link href="/dashboard/upload" className="font-medium text-black underline">
          Return to Upload
        </Link>{" "}
        when your files are ready.
      </p>
    </div>
  );
}

function GatewayBlock({
  title,
  steps,
  howWeRead,
}: {
  title: string;
  steps: string[];
  howWeRead: string;
}) {
  return (
    <div className="brand-panel space-y-2 p-6">
      <h3 className="font-medium text-black">{title}</h3>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="text-sm text-[var(--muted)]">
        <strong className="font-medium text-black">How we read it:</strong>{" "}
        {howWeRead}
      </p>
    </div>
  );
}

function ColRow({
  name,
  required,
  aliases,
}: {
  name: string;
  required: boolean;
  aliases: string;
}) {
  return (
    <tr className="border-b border-[var(--border)]">
      <td className="py-2 pr-4">
        <code className="text-xs">{name}</code>
      </td>
      <td className="py-2 pr-4 text-[var(--muted)]">{required ? "Yes" : "No"}</td>
      <td className="py-2 text-[var(--muted)]">{aliases}</td>
    </tr>
  );
}

function Trouble({ symptom, fix }: { symptom: string; fix: string }) {
  return (
    <tr className="border-b border-[var(--border)] align-top">
      <td className="py-2 pr-4 font-medium text-black">{symptom}</td>
      <td className="py-2">{fix}</td>
    </tr>
  );
}
