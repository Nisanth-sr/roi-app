"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
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
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (!confirm("Sign out?")) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-8">
          <BrandMark href="/dashboard" size="sm" />
          <nav className="hidden gap-5 text-sm sm:flex">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/dashboard" &&
                  pathname.startsWith(link.href + "/")) ||
                (link.href === "/dashboard" && pathname === "/dashboard");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? "border-b-2 border-black pb-0.5 font-medium text-black"
                      : "text-[var(--muted)] hover:text-black"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="cursor-pointer text-sm text-[var(--muted)] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
