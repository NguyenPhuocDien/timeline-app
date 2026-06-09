import { z } from "zod";

export const workspaceMemberRoles = ["owner", "editor", "viewer"] as const;
export const taskStatuses = [
  "backlog",
  "todo",
  "doing",
  "done",
  "archived",
] as const;
export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export const eventStatuses = ["scheduled", "cancelled", "completed"] as const;
export const blockKinds = [
  "heading",
  "paragraph",
  "checklist",
  "log",
  "quote",
] as const;

export const workspaceSchema = z.object({
  id: z.string().uuid().or(z.literal("demo-workspace")),
  name: z.string().min(1),
  slug: z.string().min(1),
  timezone: z.string().min(1),
  ownerId: z.string().uuid().or(z.literal("demo-user")),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const viewerSchema = z.object({
  id: z.string().uuid().or(z.literal("demo-user")),
  email: z.string().email().or(z.literal("demo@timeline-focus.local")),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
  defaultWorkspaceId: z.string().nullable(),
});

export const labelSchema = z.object({
  id: z.string().uuid().or(z.literal("demo-label")),
  workspaceId: z.string(),
  name: z.string().min(1),
  color: z.string().min(4),
  createdAt: z.string(),
});

export const taskSchema = z.object({
  id: z.string().uuid().or(z.string().startsWith("demo-task-")),
  workspaceId: z.string(),
  title: z.string().min(1),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  startAt: z.string().nullable(),
  dueAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  estimateMinutes: z.number().int().nonnegative(),
  actualMinutes: z.number().int().nonnegative(),
  energy: z.number().int().min(1).max(5),
  eventId: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const eventSchema = z.object({
  id: z.string().uuid().or(z.string().startsWith("demo-event-")),
  workspaceId: z.string(),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: z.enum(eventStatuses),
  timezone: z.string().min(1),
  startAt: z.string(),
  endAt: z.string(),
  recurrenceRule: z.string().nullable(),
  linkedTaskId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const focusSessionSchema = z.object({
  id: z.string().uuid().or(z.string().startsWith("demo-focus-")),
  workspaceId: z.string(),
  taskId: z.string().nullable(),
  plannedMinutes: z.number().int().nonnegative(),
  actualMinutes: z.number().int().nonnegative(),
  breakMinutes: z.number().int().nonnegative(),
  interruptions: z.number().int().nonnegative(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  deviceLabel: z.string().nullable(),
  createdAt: z.string(),
});

export const workspaceSettingsSchema = z.object({
  workspaceId: z.string(),
  dailyFocusTargetMinutes: z.number().int().nonnegative(),
  defaultFocusMinutes: z.number().int().positive(),
  shortBreakMinutes: z.number().int().nonnegative(),
  longBreakMinutes: z.number().int().nonnegative(),
  weekStartsOn: z.number().int().min(0).max(6),
  timezone: z.string().min(1),
});

export const workspaceStatsSchema = z.object({
  openTasks: z.number().int().nonnegative(),
  dueSoonTasks: z.number().int().nonnegative(),
  scheduledEvents: z.number().int().nonnegative(),
  focusMinutesThisWeek: z.number().int().nonnegative(),
  completedTasksThisWeek: z.number().int().nonnegative(),
});

export const workspaceSnapshotSchema = z.object({
  mode: z.enum(["demo", "live", "degraded"]),
  viewer: viewerSchema.nullable(),
  workspace: workspaceSchema,
  membershipRole: z.enum(workspaceMemberRoles),
  tasks: z.array(taskSchema),
  events: z.array(eventSchema),
  focusSessions: z.array(focusSessionSchema),
  labels: z.array(labelSchema),
  settings: workspaceSettingsSchema,
  stats: workspaceStatsSchema,
  issues: z.array(z.string()),
});

export type Workspace = z.infer<typeof workspaceSchema>;
export type Viewer = z.infer<typeof viewerSchema>;
export type Label = z.infer<typeof labelSchema>;
export type Task = z.infer<typeof taskSchema>;
export type CalendarEvent = z.infer<typeof eventSchema>;
export type FocusSession = z.infer<typeof focusSessionSchema>;
export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;
export type WorkspaceStats = z.infer<typeof workspaceStatsSchema>;
export type WorkspaceSnapshot = z.infer<typeof workspaceSnapshotSchema>;
export type WorkspaceMemberRole = (typeof workspaceMemberRoles)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type EventStatus = (typeof eventStatuses)[number];
export type BlockKind = (typeof blockKinds)[number];

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          default_workspace_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          default_workspace_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      workspaces: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: WorkspaceMemberRole;
          joined_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: WorkspaceMemberRole;
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspace_members"]["Insert"]>;
      };
      labels: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["labels"]["Insert"]>;
      };
      views: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          kind: string;
          config: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          kind: string;
          config?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["views"]["Insert"]>;
      };
      activity_logs: {
        Row: {
          id: string;
          workspace_id: string;
          actor_id: string | null;
          entity_type: string;
          entity_id: string | null;
          action: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          actor_id?: string | null;
          entity_type: string;
          entity_id?: string | null;
          action: string;
          payload?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_logs"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          status: TaskStatus;
          priority: TaskPriority;
          start_at: string | null;
          due_at: string | null;
          completed_at: string | null;
          estimate_minutes: number;
          actual_minutes: number;
          energy: number;
          event_id: string | null;
          tags: string[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          status?: TaskStatus;
          priority?: TaskPriority;
          start_at?: string | null;
          due_at?: string | null;
          completed_at?: string | null;
          estimate_minutes?: number;
          actual_minutes?: number;
          energy?: number;
          event_id?: string | null;
          tags?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      task_blocks: {
        Row: {
          id: string;
          workspace_id: string;
          task_id: string;
          kind: BlockKind;
          content: string;
          position: number;
          checked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          task_id: string;
          kind: BlockKind;
          content?: string;
          position?: number;
          checked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_blocks"]["Insert"]>;
      };
      events: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          status: EventStatus;
          timezone: string;
          start_at: string;
          end_at: string;
          recurrence_rule: string | null;
          linked_task_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          description?: string | null;
          status?: EventStatus;
          timezone?: string;
          start_at: string;
          end_at: string;
          recurrence_rule?: string | null;
          linked_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      focus_sessions: {
        Row: {
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
        };
        Insert: {
          id?: string;
          workspace_id: string;
          task_id?: string | null;
          planned_minutes?: number;
          actual_minutes?: number;
          break_minutes?: number;
          interruptions?: number;
          started_at: string;
          ended_at?: string | null;
          device_label?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["focus_sessions"]["Insert"]>;
      };
      workspace_settings: {
        Row: {
          workspace_id: string;
          daily_focus_target_minutes: number;
          default_focus_minutes: number;
          short_break_minutes: number;
          long_break_minutes: number;
          week_starts_on: number;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          daily_focus_target_minutes?: number;
          default_focus_minutes?: number;
          short_break_minutes?: number;
          long_break_minutes?: number;
          week_starts_on?: number;
          timezone?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspace_settings"]["Insert"]>;
      };
    };
  };
};
