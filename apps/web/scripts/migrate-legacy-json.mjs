import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const args = process.argv.slice(2);

function getArg(name) {
  const index = args.findIndex((arg) => arg === `--${name}`);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

const filePath = getArg("file");
const workspaceIdArg = getArg("workspace-id");
const userIdArg = getArg("user-id");
const timezone = getArg("timezone") ?? "Asia/Bangkok";
const dryRun = hasFlag("dry-run");

if (!filePath || (!workspaceIdArg && !userIdArg)) {
  console.error(
    [
      "Usage:",
      "node scripts/migrate-legacy-json.mjs --file <legacy.json> --workspace-id <uuid>",
      "or",
      "node scripts/migrate-legacy-json.mjs --file <legacy.json> --user-id <uuid>",
      "Optional: --timezone Asia/Bangkok --dry-run",
    ].join("\n"),
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
  );
  process.exit(1);
}

const legacyTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  duration: z.number().optional().default(0),
  priority: z.enum(["high", "medium", "low"]).optional().default("medium"),
  status: z
    .enum(["todo", "doing", "done", "deferred", "stack", "deleted"])
    .optional()
    .default("todo"),
  mission: z.boolean().optional().default(false),
  done: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(""),
  start: z.string().optional(),
  end: z.string().optional(),
  deadline: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  doneAt: z.string().optional(),
  eventId: z.string().optional(),
  flow: z
    .object({
      summary: z.string().optional().default(""),
      checklist: z
        .array(
          z.object({
            text: z.string().optional().default(""),
            done: z.boolean().optional().default(false),
          }),
        )
        .optional()
        .default([]),
      notes: z
        .array(
          z.object({
            text: z.string().optional().default(""),
          }),
        )
        .optional()
        .default([]),
      blockers: z
        .array(
          z.object({
            text: z.string().optional().default(""),
          }),
        )
        .optional()
        .default([]),
      nextActions: z
        .array(
          z.object({
            text: z.string().optional().default(""),
          }),
        )
        .optional()
        .default([]),
      logs: z
        .array(
          z.object({
            text: z.string().optional().default(""),
          }),
        )
        .optional()
        .default([]),
    })
    .optional(),
});

const legacyEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["solar", "lunar"]).optional().default("solar"),
  date: z.string(),
  recurring: z.boolean().optional().default(false),
  notes: z.string().optional().default(""),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const legacySessionSchema = z.object({
  id: z.string(),
  taskId: z.string().optional(),
  date: z.string().optional(),
  minutes: z.number().optional().default(0),
  createdAt: z.string().optional(),
});

const legacyPayloadSchema = z.object({
  tasks: z.array(legacyTaskSchema).optional().default([]),
  events: z.array(legacyEventSchema).optional().default([]),
  sessions: z.array(legacySessionSchema).optional().default([]),
  settings: z.record(z.any()).optional().default({}),
  reviews: z.record(z.any()).optional().default({}),
});

function asIso(date, time = "09:00") {
  const value = new Date(`${date}T${time}:00+07:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function mapLegacyStatus(status) {
  switch (status) {
    case "doing":
      return "doing";
    case "done":
      return "done";
    case "stack":
    case "deferred":
      return "backlog";
    case "deleted":
      return "archived";
    default:
      return "todo";
  }
}

function mapLegacyPriority(priority) {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }
  return "medium";
}

function buildTaskBlocks(task, workspaceId) {
  const blocks = [];
  let position = 0;

  if (task.notes) {
    blocks.push({
      workspace_id: workspaceId,
      task_id: task.id,
      kind: "paragraph",
      content: task.notes,
      position: position++,
      checked: false,
    });
  }

  if (task.flow?.summary) {
    blocks.push({
      workspace_id: workspaceId,
      task_id: task.id,
      kind: "heading",
      content: task.flow.summary,
      position: position++,
      checked: false,
    });
  }

  for (const item of task.flow?.checklist ?? []) {
    if (!item.text) continue;
    blocks.push({
      workspace_id: workspaceId,
      task_id: task.id,
      kind: "checklist",
      content: item.text,
      position: position++,
      checked: item.done,
    });
  }

  for (const collectionName of ["notes", "blockers", "nextActions", "logs"]) {
    for (const item of task.flow?.[collectionName] ?? []) {
      if (!item.text) continue;
      blocks.push({
        workspace_id: workspaceId,
        task_id: task.id,
        kind: collectionName === "logs" ? "log" : "paragraph",
        content: `[${collectionName}] ${item.text}`,
        position: position++,
        checked: false,
      });
    }
  }

  return blocks;
}

async function resolveWorkspaceId(supabase) {
  if (workspaceIdArg) return workspaceIdArg;

  const { data, error } = await supabase
    .from("profiles")
    .select("default_workspace_id")
    .eq("id", userIdArg)
    .maybeSingle();

  if (error || !data?.default_workspace_id) {
    throw new Error(
      "Could not resolve default workspace for the provided user id.",
    );
  }

  return data.default_workspace_id;
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const absolutePath = path.resolve(process.cwd(), filePath);
const raw = await fs.readFile(absolutePath, "utf8");
const legacyPayload = legacyPayloadSchema.parse(JSON.parse(raw));
const workspaceId = await resolveWorkspaceId(supabase);

const taskRows = legacyPayload.tasks
  .filter((task) => task.status !== "deleted")
  .map((task) => ({
    id: task.id,
    workspace_id: workspaceId,
    title: task.title,
    status: mapLegacyStatus(task.status),
    priority: mapLegacyPriority(task.priority),
    start_at: task.start ? asIso(task.date, task.start) : null,
    due_at: task.deadline
      ? asIso(task.date, task.deadline)
      : task.end
        ? asIso(task.date, task.end)
        : asIso(task.date),
    completed_at:
      task.status === "done"
        ? task.doneAt ?? task.updatedAt ?? task.createdAt ?? null
        : null,
    estimate_minutes: Math.max(0, task.duration ?? 0),
    actual_minutes: task.status === "done" ? Math.max(0, task.duration ?? 0) : 0,
    energy: task.mission ? 5 : 3,
    event_id: task.eventId ?? null,
    tags: task.tags ?? [],
    created_at: task.createdAt ?? new Date().toISOString(),
    updated_at: task.updatedAt ?? task.createdAt ?? new Date().toISOString(),
  }));

const taskBlockRows = legacyPayload.tasks.flatMap((task) =>
  buildTaskBlocks(task, workspaceId),
);

const eventRows = legacyPayload.events.map((event) => ({
  id: event.id,
  workspace_id: workspaceId,
  title: event.title,
  description:
    `${event.notes || ""}${event.type === "lunar" ? "\n[Legacy lunar event]" : ""}`.trim() ||
    null,
  status: "scheduled",
  timezone,
  start_at: asIso(event.date, "09:00"),
  end_at: asIso(event.date, "10:00"),
  recurrence_rule: event.recurring ? "FREQ=YEARLY" : null,
  linked_task_id: null,
  created_at: event.createdAt ?? new Date().toISOString(),
  updated_at: event.updatedAt ?? event.createdAt ?? new Date().toISOString(),
}));

const focusRows = legacyPayload.sessions.map((session) => {
  const startedAt =
    session.createdAt ??
    (session.date ? asIso(session.date, "09:00") : new Date().toISOString());
  const actualMinutes = Math.max(0, session.minutes ?? 0);
  const endedAt = new Date(
    new Date(startedAt).getTime() + actualMinutes * 60000,
  ).toISOString();

  return {
    id: session.id,
    workspace_id: workspaceId,
    task_id: session.taskId ?? null,
    planned_minutes: actualMinutes || 25,
    actual_minutes: actualMinutes,
    break_minutes: 0,
    interruptions: 0,
    started_at: startedAt,
    ended_at: endedAt,
    device_label: "Legacy import",
    created_at: session.createdAt ?? startedAt,
  };
});

const settingsRow = {
  workspace_id: workspaceId,
  timezone,
  daily_focus_target_minutes:
    Number(legacyPayload.settings.dailyMissionLimit ?? 3) * 60,
  default_focus_minutes: 50,
  short_break_minutes: 5,
  long_break_minutes: 20,
  week_starts_on: 1,
};

console.log(
  JSON.stringify(
    {
      workspaceId,
      counts: {
        tasks: taskRows.length,
        taskBlocks: taskBlockRows.length,
        events: eventRows.length,
        focusSessions: focusRows.length,
      },
      dryRun,
    },
    null,
    2,
  ),
);

if (dryRun) {
  process.exit(0);
}

if (taskRows.length) {
  const { error } = await supabase.from("tasks").upsert(taskRows);
  if (error) throw error;
}

if (taskBlockRows.length) {
  const { error } = await supabase.from("task_blocks").insert(taskBlockRows);
  if (error) throw error;
}

if (eventRows.length) {
  const { error } = await supabase.from("events").upsert(eventRows);
  if (error) throw error;
}

if (focusRows.length) {
  const { error } = await supabase.from("focus_sessions").upsert(focusRows);
  if (error) throw error;
}

const { error: settingsError } = await supabase
  .from("workspace_settings")
  .upsert(settingsRow);

if (settingsError) throw settingsError;

await supabase.from("activity_logs").insert({
  workspace_id: workspaceId,
  actor_id: userIdArg ?? null,
  entity_type: "migration",
  action: "legacy_json_imported",
  payload: {
    tasks: taskRows.length,
    task_blocks: taskBlockRows.length,
    events: eventRows.length,
    focus_sessions: focusRows.length,
  },
});

console.log("Legacy import completed.");
