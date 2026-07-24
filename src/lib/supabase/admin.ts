import { createClient } from "@supabase/supabase-js";

export const SERVICE_ROLE_MISSING_MESSAGE =
  "Team invites require SUPABASE_SERVICE_ROLE_KEY in the server environment. Add it to .env and restart the app.";

/** Service role — migrations and trusted server tasks only. Never in client code. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin credentials");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
