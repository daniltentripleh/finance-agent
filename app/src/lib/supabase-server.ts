import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnvFromProcess } from "./supabase-env";

export function createSupabaseAdminClient() {
  const env = getSupabaseServerEnvFromProcess();

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
