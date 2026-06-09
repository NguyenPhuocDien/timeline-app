"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { getAuthViewer } from "@/lib/workspace/queries";
import type { Database } from "@/lib/domain/models";

type FocusSessionInsert =
  Database["public"]["Tables"]["focus_sessions"]["Insert"];

export type SaveFocusSessionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialSaveFocusSessionState: SaveFocusSessionState = {
  status: "idle",
  message: "",
};

const saveFocusSessionSchema = z.object({
  workspaceId: z.string().min(1),
  taskId: z.string().uuid().nullable(),
  plannedMinutes: z.coerce.number().int().nonnegative(),
  actualMinutes: z.coerce.number().int().nonnegative(),
  breakMinutes: z.coerce.number().int().nonnegative(),
  interruptions: z.coerce.number().int().nonnegative(),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1),
  deviceLabel: z.string().max(120).optional(),
});

function normalizeTaskId(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string" || !raw || raw === "none") return null;
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(raw) ? raw : null;
}

export async function saveFocusSessionAction(
  _previousState: SaveFocusSessionState,
  formData: FormData,
): Promise<SaveFocusSessionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: "Supabase chưa được cấu hình — session chỉ lưu được ở live workspace.",
    };
  }

  const parsed = saveFocusSessionSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    taskId: normalizeTaskId(formData.get("taskId")),
    plannedMinutes: formData.get("plannedMinutes"),
    actualMinutes: formData.get("actualMinutes"),
    breakMinutes: formData.get("breakMinutes"),
    interruptions: formData.get("interruptions"),
    startedAt: formData.get("startedAt"),
    endedAt: formData.get("endedAt"),
    deviceLabel: formData.get("deviceLabel") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Dữ liệu session không hợp lệ.",
    };
  }

  const viewer = await getAuthViewer();
  if (!viewer) {
    return {
      status: "error",
      message: "Bạn cần đăng nhập lại.",
    };
  }

  try {
    const supabase = await createClient();

    const startedAtDate = new Date(parsed.data.startedAt);
    const endedAtDate = new Date(parsed.data.endedAt);
    if (
      Number.isNaN(startedAtDate.getTime()) ||
      Number.isNaN(endedAtDate.getTime())
    ) {
      return { status: "error", message: "Thời gian session không hợp lệ." };
    }

    const row: FocusSessionInsert = {
      workspace_id: parsed.data.workspaceId,
      task_id: parsed.data.taskId,
      planned_minutes: parsed.data.plannedMinutes,
      actual_minutes: parsed.data.actualMinutes,
      break_minutes: parsed.data.breakMinutes,
      interruptions: parsed.data.interruptions,
      started_at: startedAtDate.toISOString(),
      ended_at: endedAtDate.toISOString(),
      device_label: parsed.data.deviceLabel ?? null,
    };

    const { error } = await supabase
      .from("focus_sessions")
      .insert(row as never);

    if (error) {
      return { status: "error", message: error.message };
    }

    revalidatePath("/app");
    revalidatePath(`/w/${parsed.data.workspaceId}`);

    const actual = parsed.data.actualMinutes;
    return {
      status: "success",
      message: `Đã lưu session ${actual} phút. Workspace đã cập nhật.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Không lưu được session.",
    };
  }
}
