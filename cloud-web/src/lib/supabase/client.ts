import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/domain/models";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error(
      "Supabase environment variables are missing. Configure cloud-web/.env.local first.",
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      env.supabaseUrl,
      env.supabasePublishableKey,
    );
  }

  return browserClient;
}
