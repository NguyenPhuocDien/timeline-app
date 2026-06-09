import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createDemoWorkspaceSnapshot, buildStats } from "@/lib/workspace/demo";
import { hasSupabaseEnv } from "@/lib/env";
import type {
  CalendarEvent,
  FocusSession,
  Label,
  Task,
  Viewer,
  WorkspaceSnapshot,
  WorkspaceSettings,
} from "@/lib/domain/models";

function toViewer(profile: {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  default_workspace_id: string | null;
}): Viewer {
  return {
    id: profile.id,
    email: profile.email ?? "unknown@timeline-focus.app",
    displayName: profile.display_name ?? "Workspace user",
    avatarUrl: profile.avatar_url,
    defaultWorkspaceId: profile.default_workspace_id,
  };
}

function toTask(row: {
  id: string;
  workspace_id: string;
  title: string;
  status: Task["status"];
  priority: Task["priority"];
  start_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  estimate_minutes: number;
  actual_minutes: number;
  energy: number;
  event_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    startAt: row.start_at,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    estimateMinutes: row.estimate_minutes,
    actualMinutes: row.actual_minutes,
    energy: row.energy,
    eventId: row.event_id,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEvent(row: {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: CalendarEvent["status"];
  timezone: string;
  start_at: string;
  end_at: string;
  recurrence_rule: string | null;
  linked_task_id: string | null;
  created_at: string;
  updated_at: string;
}): CalendarEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description,
    status: row.status,
    timezone: row.timezone,
    startAt: row.start_at,
    endAt: row.end_at,
    recurrenceRule: row.recurrence_rule,
    linkedTaskId: row.linked_task_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toFocusSession(row: {
  id: string;
  workspace_id: string;
  task_id: string | null;
  planned_minutes: number;
  actual_minutes: number;
  break_minutes: number;
  interruptions: number;
  started_at: string;
  ended_at: string | null;
  device_label: string | null;
  created_at: string;
}): FocusSession {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    taskId: row.task_id,
    plannedMinutes: row.planned_minutes,
    actualMinutes: row.actual_minutes,
    breakMinutes: row.break_minutes,
    interruptions: row.interruptions,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    deviceLabel: row.device_label,
    createdAt: row.created_at,
  };
}

function toLabel(row: {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}): Label {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

const defaultSettings: WorkspaceSettings = {
  workspaceId: "",
  dailyFocusTargetMinutes: 180,
  defaultFocusMinutes: 50,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  weekStartsOn: 1,
  timezone: "UTC",
};

export const getAuthViewer = cache(async (): Promise<Viewer | null> => {
  if (!hasSupabaseEnv()) return null;

  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();

    if (claimsError) return null;

    const claims = claimsData?.claims as { sub?: string } | undefined;
    const userId = claims?.sub;

    if (!userId) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url, default_workspace_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) return null;

    return toViewer(profile);
  } catch {
    return null;
  }
});

export async function getWorkspaceSnapshot(
  workspaceId: string,
): Promise<WorkspaceSnapshot | null> {
  if (!hasSupabaseEnv()) {
    return createDemoWorkspaceSnapshot(workspaceId);
  }

  const viewer = await getAuthViewer();
  if (!viewer) return null;

  try {
    const supabase = await createClient();

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", viewer.id)
      .maybeSingle();

    if (membershipError || !membership) return null;

    const membershipRow = membership as {
      role: WorkspaceSnapshot["membershipRole"];
    };

    const [workspaceResult, tasksResult, eventsResult, focusResult, labelsResult, settingsResult] =
      await Promise.all([
        supabase
          .from("workspaces")
          .select("id, owner_id, name, slug, timezone, created_at, updated_at")
          .eq("id", workspaceId)
          .maybeSingle(),
        supabase
          .from("tasks")
          .select(
            "id, workspace_id, title, status, priority, start_at, due_at, completed_at, estimate_minutes, actual_minutes, energy, event_id, tags, created_at, updated_at",
          )
          .eq("workspace_id", workspaceId)
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
          .limit(12),
        supabase
          .from("events")
          .select(
            "id, workspace_id, title, description, status, timezone, start_at, end_at, recurrence_rule, linked_task_id, created_at, updated_at",
          )
          .eq("workspace_id", workspaceId)
          .order("start_at", { ascending: true })
          .limit(8),
        supabase
          .from("focus_sessions")
          .select(
            "id, workspace_id, task_id, planned_minutes, actual_minutes, break_minutes, interruptions, started_at, ended_at, device_label, created_at",
          )
          .eq("workspace_id", workspaceId)
          .order("started_at", { ascending: false })
          .limit(12),
        supabase
          .from("labels")
          .select("id, workspace_id, name, color, created_at")
          .eq("workspace_id", workspaceId)
          .order("name", { ascending: true })
          .limit(12),
        supabase
          .from("workspace_settings")
          .select(
            "workspace_id, daily_focus_target_minutes, default_focus_minutes, short_break_minutes, long_break_minutes, week_starts_on, timezone",
          )
          .eq("workspace_id", workspaceId)
          .maybeSingle(),
      ]);

    if (workspaceResult.error || !workspaceResult.data) return null;

    const workspaceRow = workspaceResult.data as {
      id: string;
      owner_id: string;
      name: string;
      slug: string;
      timezone: string;
      created_at: string;
      updated_at: string;
    };

    const issues = [
      tasksResult.error?.message,
      eventsResult.error?.message,
      focusResult.error?.message,
      labelsResult.error?.message,
      settingsResult.error?.message,
    ].filter(Boolean) as string[];

    const tasks = (tasksResult.data ?? []).map(toTask);
    const events = (eventsResult.data ?? []).map(toEvent);
    const focusSessions = (focusResult.data ?? []).map(toFocusSession);
    const labels = (labelsResult.data ?? []).map(toLabel);
    const settingsRow = settingsResult.data as
      | {
          workspace_id: string;
          daily_focus_target_minutes: number;
          default_focus_minutes: number;
          short_break_minutes: number;
          long_break_minutes: number;
          week_starts_on: number;
          timezone: string;
        }
      | null;

    const settings = settingsRow
      ? {
          workspaceId: settingsRow.workspace_id,
          dailyFocusTargetMinutes: settingsRow.daily_focus_target_minutes,
          defaultFocusMinutes: settingsRow.default_focus_minutes,
          shortBreakMinutes: settingsRow.short_break_minutes,
          longBreakMinutes: settingsRow.long_break_minutes,
          weekStartsOn: settingsRow.week_starts_on,
          timezone: settingsRow.timezone,
        }
      : { ...defaultSettings, workspaceId, timezone: workspaceRow.timezone };

    return {
      mode: issues.length ? "degraded" : "live",
      viewer,
      workspace: {
        id: workspaceRow.id,
        name: workspaceRow.name,
        slug: workspaceRow.slug,
        timezone: workspaceRow.timezone,
        ownerId: workspaceRow.owner_id,
        createdAt: workspaceRow.created_at,
        updatedAt: workspaceRow.updated_at,
      },
      membershipRole: membershipRow.role,
      tasks,
      events,
      focusSessions,
      labels,
      settings,
      stats: buildStats(tasks, events, focusSessions),
      issues,
    };
  } catch (error) {
    const demo = createDemoWorkspaceSnapshot(workspaceId);
    return {
      ...demo,
      mode: "degraded",
      viewer,
      issues: [
        "Supabase tables are not ready yet, so the workspace is showing demo-shaped fallback data.",
        error instanceof Error ? error.message : "Unknown workspace query error.",
      ],
    };
  }
}
