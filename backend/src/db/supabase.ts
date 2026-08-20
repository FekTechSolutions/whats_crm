import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

// This client bypasses RLS. It must only be used by the backend.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
