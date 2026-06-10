"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, hasSupabaseEnv } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/auth/redirects";

export type MagicLinkState = {
  status: "idle" | "success" | "error";
  message: string;
};

const emailSchema = z.string().trim().email();

function resolveTrustedOrigin(originHeader: string | null) {
  const appUrl = getAppUrl();
  if (!originHeader) return appUrl;

  try {
    const origin = new URL(originHeader);
    const appOrigin = new URL(appUrl);
    return origin.origin === appOrigin.origin ? origin.origin : appOrigin.origin;
  } catch {
    return appUrl;
  }
}

export async function requestMagicLink(
  _previousState: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message:
        "Supabase env chưa được cấu hình. Hãy thêm .env.local trước khi bật auth thật.",
    };
  }

  const emailResult = emailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return {
      status: "error",
      message: "Email không hợp lệ.",
    };
  }

  try {
    const rawNextPath = formData.get("next");
    const nextPath = sanitizeNextPath(
      typeof rawNextPath === "string" ? rawNextPath : null,
    );
    const headerStore = await headers();
    const origin = resolveTrustedOrigin(headerStore.get("origin"));
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: emailResult.data,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      return {
        status: "error",
        message: error.message,
      };
    }

    return {
      status: "success",
      message:
        "Magic link đã được gửi. Mở email bằng bất kỳ thiết bị nào và bạn sẽ vào cùng workspace.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Không gửi được magic link.",
    };
  }
}
