import { createClient } from "@/lib/supabase/client";

export const COMPANY_NAME_STORAGE_KEY = "4emet_company_name";

export async function signInWithGoogle(options?: {
  next?: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const next = options?.next ?? "/dashboard";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  return { error: error?.message ?? null };
}
