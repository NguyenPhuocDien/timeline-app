"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { taskPriorities, taskStatuses, type TaskStatus, type TaskPriority } from "@/lib/domain/models";
import type { Database } from "@/lib/domain/models";
import { getAuthViewer } from "@/lib/workspace/queries";

const taskCreateSchema = z.object({
  workspaceId: z.string().uuid().or(z.literal("demo-workspace")),
  title: z.string().trim().min(1).max(200),
  priority: z.enum(taskPriorities).default("medium"),
  estimateMinutes: z.coerce.number().int().min(5).max(480).default(50),
  dueAt: z.string().trim().optional(),
  tags: z.string().trim().optional(),
});

const taskStatusSchema = z.object({
  workspaceId: z.string().uuid().or(z.literal("demo-workspace")),
  taskId: z.string().uuid(),
  nextStatus: z.enum(taskStatuses),
});

const archiveSchema = z.object({
  workspaceId: z.string().uuid().or(z.literal("demo-workspace")),
  taskId: z.string().uuid(),
});

export type TaskMutationState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialTaskMutationState: TaskMutationState = {
  status: "idle",
  message: "",
};

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type ActivityLogInsert = Database["public"]["Tables"]["activity_logs"]["Insert"];

function normalizeTags(raw: string | undefined) {
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(/[,\s]+/)
        .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

function normalizeDueAt(raw: string | undefined) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function revalidateWorkspacePaths(workspaceId: string) {
  revalidatePath("/app");
  revalidatePath(`/w/${workspaceId}`);
}

async function writeActivityLog(
  workspaceId: string,
  actorId: string,
  entityId: string | null,
  action: string,
  payload: Record<string, string | number | boolean | null>,
) {
  const supabase = await createClient();
  const row: ActivityLogInsert = {
    workspace_id: workspaceId,
    actor_id: actorId,
    entity_type: "task",
    entity_id: entityId,
    action,
    payload,
  };

  const { error } = await supabase.from("activity_logs").insert(row as never);
  if (error) {
    console.error("Failed to write task activity log", error.message);
  }
}

export async function createTaskAction(
  _previousState: TaskMutationState,
  formData: FormData,
): Promise<TaskMutationState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: "Supabase chưa được cấu hình nên task live chưa bật được.",
    };
  }

  const parsed = taskCreateSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    title: formData.get("title"),
    priority: formData.get("priority"),
    estimateMinutes: formData.get("estimateMinutes"),
    dueAt: formData.get("dueAt"),
    tags: formData.get("tags"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Task form không hợp lệ. Kiểm tra title, estimate và priority.",
    };
  }

  const viewer = await getAuthViewer();
  if (!viewer) {
    return {
      status: "error",
      message: "Bạn cần đăng nhập lại trước khi tạo task.",
    };
  }

  try {
    const supabase = await createClient();
    const dueAt = normalizeDueAt(parsed.data.dueAt);
    const row: TaskInsert = {
      workspace_id: parsed.data.workspaceId,
      title: parsed.data.title,
      priority: parsed.data.priority,
      status: "todo",
      estimate_minutes: parsed.data.estimateMinutes,
      due_at: dueAt,
      tags: normalizeTags(parsed.data.tags),
      created_by: viewer.id,
    };

    const { data: inserted, error } = await supabase
      .from("tasks")
      .insert(row as never)
      .select("id")
      .maybeSingle();

    if (error) {
      return {
        status: "error",
        message: error.message,
      };
    }

    const newTaskId = (inserted as { id?: string } | null)?.id ?? null;

    await writeActivityLog(
      parsed.data.workspaceId,
      viewer.id,
      newTaskId,
      "task_created",
      {
        title: parsed.data.title,
        priority: parsed.data.priority,
        estimateMinutes: parsed.data.estimateMinutes,
        hasDueAt: Boolean(dueAt),
      },
    );

    revalidateWorkspacePaths(parsed.data.workspaceId);

    return {
      status: "success",
      message: "Đã tạo task mới trong workspace cloud.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Không tạo được task.",
    };
  }
}

export async function updateTaskStatusAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return;
  }

  const parsed = taskStatusSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    taskId: formData.get("taskId"),
    nextStatus: formData.get("nextStatus"),
  });

  if (!parsed.success) {
    return;
  }

  const viewer = await getAuthViewer();
  if (!viewer) return;

  const supabase = await createClient();
  const isDone = parsed.data.nextStatus === "done";
  const row: TaskUpdate = {
    status: parsed.data.nextStatus,
    completed_at: isDone ? new Date().toISOString() : null,
  };

  await supabase
    .from("tasks")
    .update(row as never)
    .eq("id", parsed.data.taskId)
    .eq("workspace_id", parsed.data.workspaceId);

  await writeActivityLog(
    parsed.data.workspaceId,
    viewer.id,
    parsed.data.taskId,
    "task_status_changed",
    {
      nextStatus: parsed.data.nextStatus,
      markedDone: isDone,
    },
  );

  revalidateWorkspacePaths(parsed.data.workspaceId);
}

export async function archiveTaskAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return;
  }

  const parsed = archiveSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    taskId: formData.get("taskId"),
  });

  if (!parsed.success) {
    return;
  }

  const viewer = await getAuthViewer();
  if (!viewer) return;

  const supabase = await createClient();
  const row: TaskUpdate = {
    status: "archived",
    completed_at: null,
  };

  await supabase
    .from("tasks")
    .update(row as never)
    .eq("id", parsed.data.taskId)
    .eq("workspace_id", parsed.data.workspaceId);

  await writeActivityLog(
    parsed.data.workspaceId,
    viewer.id,
    parsed.data.taskId,
    "task_archived",
    {
      archived: true,
    },
  );

  revalidateWorkspacePaths(parsed.data.workspaceId);
}

// ── Update task (full edit) ──────────────────────────────────────────────────

const taskUpdateSchema = z.object({
  workspaceId: z.string().uuid().or(z.literal("demo-workspace")),
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  priority: z.enum(taskPriorities),
  status: z.enum(taskStatuses),
  estimateMinutes: z.coerce.number().int().min(5).max(480).default(50),
  energy: z.coerce.number().int().min(1).max(5).default(3),
  startAt: z.string().trim().optional(),
  dueAt: z.string().trim().optional(),
  tags: z.string().trim().optional(),
});

export async function updateTaskAction(
  _previousState: TaskMutationState,
  formData: FormData,
): Promise<TaskMutationState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: "Supabase chưa được cấu hình nên không sửa được task live.",
    };
  }

  const parsed = taskUpdateSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    taskId: formData.get("taskId"),
    title: formData.get("title"),
    priority: formData.get("priority"),
    status: formData.get("status"),
    estimateMinutes: formData.get("estimateMinutes"),
    energy: formData.get("energy"),
    startAt: formData.get("startAt"),
    dueAt: formData.get("dueAt"),
    tags: formData.get("tags"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Dữ liệu không hợp lệ. Kiểm tra lại các trường." };
  }

  const viewer = await getAuthViewer();
  if (!viewer) {
    return { status: "error", message: "Bạn cần đăng nhập lại." };
  }

  try {
    const supabase = await createClient();
    const isDone = parsed.data.status === "done";
    const row: TaskUpdate = {
      title: parsed.data.title,
      priority: parsed.data.priority as TaskPriority,
      status: parsed.data.status as TaskStatus,
      estimate_minutes: parsed.data.estimateMinutes,
      energy: parsed.data.energy,
      start_at: normalizeDueAt(parsed.data.startAt),
      due_at: normalizeDueAt(parsed.data.dueAt),
      tags: normalizeTags(parsed.data.tags),
      completed_at: isDone ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from("tasks")
      .update(row as never)
      .eq("id", parsed.data.taskId)
      .eq("workspace_id", parsed.data.workspaceId);

    if (error) return { status: "error", message: error.message };

    await writeActivityLog(
      parsed.data.workspaceId,
      viewer.id,
      parsed.data.taskId,
      "task_updated",
      { title: parsed.data.title, priority: parsed.data.priority, status: parsed.data.status },
    );

    revalidateWorkspacePaths(parsed.data.workspaceId);
    return { status: "success", message: "Đã cập nhật task." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Không cập nhật được task.",
    };
  }
}

// ── Delete task (permanent) ───────────────────────────────────────────────────

const deleteTaskSchema = z.object({
  workspaceId: z.string().uuid().or(z.literal("demo-workspace")),
  taskId: z.string().uuid(),
});

export async function deleteTaskAction(formData: FormData) {
  if (!hasSupabaseEnv()) return;

  const parsed = deleteTaskSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    taskId: formData.get("taskId"),
  });

  if (!parsed.success) return;

  const viewer = await getAuthViewer();
  if (!viewer) return;

  const supabase = await createClient();

  await supabase
    .from("tasks")
    .delete()
    .eq("id", parsed.data.taskId)
    .eq("workspace_id", parsed.data.workspaceId);

  await writeActivityLog(
    parsed.data.workspaceId,
    viewer.id,
    parsed.data.taskId,
    "task_deleted",
    { permanent: true },
  );

  revalidateWorkspacePaths(parsed.data.workspaceId);
}
