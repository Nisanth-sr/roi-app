"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/upload", label: "Upload" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/red-flags", label: "Red flags" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-zinc-900">
            AI ROI Middleware
          </Link>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "font-medium text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
