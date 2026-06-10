import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceEnv } from "@/lib/env";
import type { Database } from "@/lib/domain/models";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  const env = getSupabaseServiceEnv();

  if (!env) {
    throw new Error(
      "Supabase service role environment variables are missing. Configure SUPABASE_SERVICE_ROLE_KEY first.",
    );
  }

  if (!adminClient) {
    adminClient = createClient<Database>(
      env.supabaseUrl,
      env.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return adminClient;
}
