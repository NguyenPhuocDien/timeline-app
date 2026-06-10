import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, hasSupabaseEnv } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/auth/redirects";

type CallbackRouteProps = {
  request: Request;
};

export async function GET(request: CallbackRouteProps["request"]) {
  const requestUrl = new URL(request.url);
  const nextPath = requestUrl.searchParams.get("next");
  const safeNext = sanitizeNextPath(nextPath);

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL("/w/demo-workspace", getAppUrl()));
  }

  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
