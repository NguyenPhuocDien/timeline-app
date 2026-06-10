"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { getAuthViewer } from "@/lib/workspace/queries";
import type { Database } from "@/lib/domain/models";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

export type EventMutationState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialEventMutationState: EventMutationState = {
  status: "idle",
  message: "",
};

const createEventSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).optional(),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  timezone: z.string().min(1).default("UTC"),
});

export async function createEventAction(
  _previousState: EventMutationState,
  formData: FormData,
): Promise<EventMutationState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: "Supabase chưa được cấu hình — event chỉ tạo được ở live workspace.",
    };
  }

  const descriptionRaw = formData.get("description");
  const parsed = createEventSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    title: formData.get("title"),
    description:
      typeof descriptionRaw === "string" && descriptionRaw.trim()
        ? descriptionRaw.trim()
        : undefined,
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Dữ liệu event không hợp lệ. Kiểm tra title và thời gian.",
    };
  }

  const viewer = await getAuthViewer();
  if (!viewer) {
    return { status: "error", message: "Bạn cần đăng nhập lại." };
  }

  try {
    const startDate = new Date(parsed.data.startAt);
    const endDate = new Date(parsed.data.endAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { status: "error", message: "Thời gian không hợp lệ." };
    }

    if (endDate <= startDate) {
      return {
        status: "error",
        message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
      };
    }

    const supabase = await createClient();
    const row: EventInsert = {
      workspace_id: parsed.data.workspaceId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: "scheduled",
      timezone: parsed.data.timezone,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      recurrence_rule: null,
      linked_task_id: null,
    };

    const { error } = await supabase.from("events").insert(row as never);

    if (error) {
      return { status: "error", message: error.message };
    }

    revalidatePath("/app");
    revalidatePath(`/w/${parsed.data.workspaceId}`);

    return {
      status: "success",
      message: `Event "${parsed.data.title}" đã được tạo.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Không tạo được event.",
    };
  }
}
