import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/api/auth";

export default async function HomePage() {
  const ctx = await getAuthContext();
  if (ctx) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          AI ROI Middleware
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          See which of your clients are quietly costing more than they pay.
          Upload your AI logs and revenue — get per-client margin in seconds.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-white"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
