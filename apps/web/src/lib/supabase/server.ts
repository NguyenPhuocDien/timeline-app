import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/domain/models";

export async function createClient() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error(
      "Supabase environment variables are missing. Configure apps/web/.env.local first.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components can read cookies but may not always write them.
          }
        },
      },
    },
  );
}
