import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { getAuthContext } from "@/lib/api/auth";

export default async function HomePage() {
  const ctx = await getAuthContext();
  if (ctx) redirect("/dashboard");

  return (
    <div className="brand-shell flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <div className="flex justify-center">
          <BrandMark href={null} size="lg" />
        </div>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
          See which of your clients are quietly costing more than they pay.
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Upload AI usage and revenue — get per-client margin and efficiency
          visibility.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/signup" className="brand-btn">
            Get started
          </Link>
          <Link href="/login" className="brand-btn-ghost">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
