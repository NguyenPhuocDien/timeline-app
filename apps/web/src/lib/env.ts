type PublicEnv = {
  appUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
};

type ServiceEnv = PublicEnv & {
  supabaseServiceRoleKey: string;
};

function resolveAppUrl(): string {
  // Explicit override wins
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Vercel production URL (auto-set by Vercel, no protocol)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // Vercel preview/branch URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function readPublicEnv(): PublicEnv {
  return {
    appUrl: resolveAppUrl(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabasePublishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  };
}

export function hasSupabaseEnv() {
  const env = readPublicEnv();
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export function getSupabaseEnv() {
  if (!hasSupabaseEnv()) return null;
  return readPublicEnv();
}

export function getAppUrl() {
  return readPublicEnv().appUrl;
}

export function hasSupabaseServiceEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getSupabaseServiceEnv(): ServiceEnv | null {
  const publicEnv = getSupabaseEnv();

  if (!publicEnv || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return {
    ...publicEnv,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
