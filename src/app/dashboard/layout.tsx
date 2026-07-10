import { DashboardNav } from "@/components/DashboardNav";
import { getAuthContext } from "@/lib/api/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
