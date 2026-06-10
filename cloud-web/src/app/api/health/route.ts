import { NextResponse } from "next/server";
import { hasSupabaseEnv, hasSupabaseServiceEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const exposeDiagnostics = process.env.NODE_ENV !== "production";
  const supabaseConfigured = hasSupabaseEnv();
  const serviceRoleConfigured = hasSupabaseServiceEnv();
  let database = "unchecked";
  let error: string | null = null;
  let responseStatus = 200;

  if (!supabaseConfigured) {
    database = "missing_env";
    responseStatus = 503;
  } else if (!serviceRoleConfigured) {
    database = "missing_service_role";
    responseStatus = 503;
  } else {
    try {
      const supabase = createAdminClient();
      const { error: pingError } = await supabase
        .from("workspaces")
        .select("id")
        .limit(1);

      if (pingError) {
        database = "unreachable";
        error = exposeDiagnostics ? pingError.message : "Database health check failed.";
        responseStatus = 503;
      } else {
        database = "ok";
      }
    } catch (caughtError) {
      database = "unreachable";
      error =
        exposeDiagnostics && caughtError instanceof Error
          ? caughtError.message
          : "Database health check failed.";
      responseStatus = 503;
    }
  }

  return NextResponse.json(
    {
      status: responseStatus === 200 ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      supabase: supabaseConfigured ? "configured" : "missing",
      serviceRole: serviceRoleConfigured ? "configured" : "missing",
      database,
      error,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    {
      status: responseStatus,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
