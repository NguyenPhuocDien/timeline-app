"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, hasSupabaseEnv } from "@/lib/env";

export type MagicLinkState = {
  status: "idle" | "success" | "error";
  message: string;
};

const emailSchema = z.string().trim().email();

function normalizeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/app";
  }

  return value;
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
    const nextPath = normalizeNextPath(formData.get("next"));
    const headerStore = await headers();
    const origin = headerStore.get("origin") ?? getAppUrl();
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
