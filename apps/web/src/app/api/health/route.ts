import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseConfigured = hasSupabaseEnv();

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      supabase: supabaseConfigured ? "configured" : "missing",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
