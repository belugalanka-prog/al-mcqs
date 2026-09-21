import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS, so it must never be imported into a
 * Client Component. This is the only thing allowed to read
 * questions.correct_answer.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
