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
          <BrandMark href={null} size="lg" showWordmark={false} />
        </div>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-black sm:text-6xl">
          4emet
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          See which of your clients are quietly costing more than they pay.
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
