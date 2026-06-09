import type {
  CalendarEvent,
  FocusSession,
  Label,
  Task,
  Viewer,
  WorkspaceSettings,
  WorkspaceSnapshot,
  WorkspaceStats,
} from "@/lib/domain/models";

const demoViewer: Viewer = {
  id: "demo-user",
  email: "demo@timeline-focus.local",
  displayName: "Demo Workspace",
  avatarUrl: null,
  defaultWorkspaceId: "demo-workspace",
};

function now() {
  return new Date();
}

function isoFromNow(hours: number) {
  const date = now();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function buildStats(
  tasks: Task[],
  events: CalendarEvent[],
  focusSessions: FocusSession[],
): WorkspaceStats {
  const current = now();
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - 7);

  return {
    openTasks: tasks.filter((task) => task.status !== "done").length,
    dueSoonTasks: tasks.filter((task) => {
      if (!task.dueAt || task.status === "done") return false;
      const dueAt = new Date(task.dueAt);
      return dueAt >= current && dueAt <= new Date(current.getTime() + 48 * 60 * 60 * 1000);
    }).length,
    scheduledEvents: events.filter((event) => event.status === "scheduled").length,
    focusMinutesThisWeek: focusSessions
      .filter((session) => new Date(session.startedAt) >= weekStart)
      .reduce((sum, session) => sum + session.actualMinutes, 0),
    completedTasksThisWeek: tasks.filter((task) => {
      if (!task.completedAt) return false;
      return new Date(task.completedAt) >= weekStart;
    }).length,
  };
}

export function createDemoWorkspaceSnapshot(
  workspaceId = "demo-workspace",
): WorkspaceSnapshot {
  const createdAt = isoFromNow(-72);

  const tasks: Task[] = [
    {
      id: "demo-task-1",
      workspaceId,
      title: "Ship workspace-first schema review",
      status: "doing",
      priority: "urgent",
      startAt: isoFromNow(-1),
      dueAt: isoFromNow(6),
      completedAt: null,
      estimateMinutes: 120,
      actualMinutes: 65,
      energy: 5,
      eventId: "demo-event-1",
      tags: ["architecture", "database"],
      createdAt,
      updatedAt: isoFromNow(-1),
    },
    {
      id: "demo-task-2",
      workspaceId,
      title: "Map legacy sessions to focus_sessions",
      status: "todo",
      priority: "high",
      startAt: isoFromNow(3),
      dueAt: isoFromNow(12),
      completedAt: null,
      estimateMinutes: 90,
      actualMinutes: 0,
      energy: 4,
      eventId: null,
      tags: ["migration", "focus"],
      createdAt,
      updatedAt: isoFromNow(-3),
    },
    {
      id: "demo-task-3",
      workspaceId,
      title: "Draft onboarding flow for magic-link login",
      status: "done",
      priority: "medium",
      startAt: isoFromNow(-24),
      dueAt: isoFromNow(-18),
      completedAt: isoFromNow(-20),
      estimateMinutes: 60,
      actualMinutes: 55,
      energy: 3,
      eventId: null,
      tags: ["auth", "ux"],
      createdAt,
      updatedAt: isoFromNow(-20),
    },
    {
      id: "demo-task-4",
      workspaceId,
      title: "Design analytics card for focus debt",
      status: "backlog",
      priority: "medium",
      startAt: null,
      dueAt: isoFromNow(36),
      completedAt: null,
      estimateMinutes: 70,
      actualMinutes: 0,
      energy: 2,
      eventId: null,
      tags: ["analytics"],
      createdAt,
      updatedAt: isoFromNow(-9),
    },
    {
      id: "demo-task-5",
      workspaceId,
      title: "Connect calendar event recurrence editor",
      status: "todo",
      priority: "high",
      startAt: isoFromNow(20),
      dueAt: isoFromNow(28),
      completedAt: null,
      estimateMinutes: 110,
      actualMinutes: 0,
      energy: 4,
      eventId: "demo-event-2",
      tags: ["calendar", "rrule"],
      createdAt,
      updatedAt: isoFromNow(-5),
    },
  ];

  const events: CalendarEvent[] = [
    {
      id: "demo-event-1",
      workspaceId,
      title: "Architecture sync",
      description: "Lock data contract for workspaces, tasks, events, and focus sessions.",
      status: "scheduled",
      timezone: "Asia/Bangkok",
      startAt: isoFromNow(2),
      endAt: isoFromNow(3),
      recurrenceRule: null,
      linkedTaskId: "demo-task-1",
      createdAt,
      updatedAt: isoFromNow(-2),
    },
    {
      id: "demo-event-2",
      workspaceId,
      title: "Weekly planning block",
      description: "Recurring planning event with workspace review and focus budgeting.",
      status: "scheduled",
      timezone: "Asia/Bangkok",
      startAt: isoFromNow(24),
      endAt: isoFromNow(25.5),
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
      linkedTaskId: null,
      createdAt,
      updatedAt: isoFromNow(-12),
    },
    {
      id: "demo-event-3",
      workspaceId,
      title: "Release retro",
      description: "Review interruption patterns and session quality.",
      status: "scheduled",
      timezone: "Asia/Bangkok",
      startAt: isoFromNow(52),
      endAt: isoFromNow(53),
      recurrenceRule: null,
      linkedTaskId: null,
      createdAt,
      updatedAt: isoFromNow(-10),
    },
  ];

  const focusSessions: FocusSession[] = [
    {
      id: "demo-focus-1",
      workspaceId,
      taskId: "demo-task-1",
      plannedMinutes: 50,
      actualMinutes: 47,
      breakMinutes: 5,
      interruptions: 1,
      startedAt: isoFromNow(-5),
      endedAt: isoFromNow(-4.2),
      deviceLabel: "MacBook Air",
      createdAt: isoFromNow(-5),
    },
    {
      id: "demo-focus-2",
      workspaceId,
      taskId: "demo-task-3",
      plannedMinutes: 25,
      actualMinutes: 25,
      breakMinutes: 5,
      interruptions: 0,
      startedAt: isoFromNow(-30),
      endedAt: isoFromNow(-29.5),
      deviceLabel: "iPhone",
      createdAt: isoFromNow(-30),
    },
    {
      id: "demo-focus-3",
      workspaceId,
      taskId: "demo-task-2",
      plannedMinutes: 90,
      actualMinutes: 62,
      breakMinutes: 10,
      interruptions: 2,
      startedAt: isoFromNow(-2),
      endedAt: isoFromNow(-1),
      deviceLabel: "Windows Laptop",
      createdAt: isoFromNow(-2),
    },
  ];

  const labels: Label[] = [
    {
      id: "demo-label",
      workspaceId,
      name: "Deep Work",
      color: "#38bdf8",
      createdAt,
    },
    {
      id: "demo-label-2",
      workspaceId,
      name: "Calendar",
      color: "#f97316",
      createdAt,
    },
    {
      id: "demo-label-3",
      workspaceId,
      name: "Migration",
      color: "#34d399",
      createdAt,
    },
  ];

  const settings: WorkspaceSettings = {
    workspaceId,
    dailyFocusTargetMinutes: 180,
    defaultFocusMinutes: 50,
    shortBreakMinutes: 5,
    longBreakMinutes: 20,
    weekStartsOn: 1,
    timezone: "Asia/Bangkok",
  };

  return {
    mode: "demo",
    viewer: demoViewer,
    workspace: {
      id: workspaceId,
      name: "Timeline Focus Demo Workspace",
      slug: "timeline-focus-demo",
      timezone: "Asia/Bangkok",
      ownerId: "demo-user",
      createdAt,
      updatedAt: isoFromNow(-1),
    },
    membershipRole: "owner",
    tasks,
    events,
    focusSessions,
    labels,
    settings,
    stats: buildStats(tasks, events, focusSessions),
    issues: [
      "Supabase env is not configured yet, so this screen is rendering demo workspace data.",
    ],
  };
}

export { buildStats };
