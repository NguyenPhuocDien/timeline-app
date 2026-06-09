"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { TaskCardActions } from "@/features/tasks/task-card-actions";
import { TaskCreateForm } from "@/features/tasks/task-create-form";
import { TaskEditModal } from "@/features/tasks/task-edit-modal";
import { FocusTimer } from "@/features/focus/focus-timer";
import { EventCreateForm } from "@/features/events/event-create-form";
import { signOutAction } from "@/features/auth/actions";
import type {
  CalendarEvent,
  FocusSession,
  Task,
  WorkspaceSnapshot,
} from "@/lib/domain/models";

type WorkspaceShellProps = {
  snapshot: WorkspaceSnapshot;
};

type WorkspaceTab = "today" | "timeline" | "calendar" | "focus" | "analytics";
type StatusFilter = "all" | "todo" | "doing" | "done";

const tabs: WorkspaceTab[] = ["today", "timeline", "calendar", "focus", "analytics"];

const TAB_LABELS: Record<WorkspaceTab, string> = {
  today: "Today",
  timeline: "Timeline",
  calendar: "Calendar",
  focus: "Focus",
  analytics: "Analytics",
};

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  todo: "To do",
  doing: "Doing",
  done: "Done",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-400 bg-white/6",
  medium: "text-sky-200 bg-sky-400/10",
  high: "text-orange-200 bg-orange-400/10",
  urgent: "text-red-200 bg-red-400/12",
};

const STATUS_DOTS: Record<string, string> = {
  backlog: "bg-slate-500",
  todo: "bg-blue-400",
  doing: "bg-amber-400",
  done: "bg-emerald-400",
  archived: "bg-slate-600",
};

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const dateOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  if (sameDay) {
    return `${s.toLocaleDateString("en", dateOpts)} · ${s.toLocaleTimeString("en", timeOpts)} – ${e.toLocaleTimeString("en", timeOpts)}`;
  }
  return `${s.toLocaleDateString("en", { ...dateOpts, ...timeOpts })} – ${e.toLocaleDateString("en", { ...dateOpts, ...timeOpts })}`;
}

function sortTasksForTimeline(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const av = a.startAt ?? a.dueAt ?? a.updatedAt;
    const bv = b.startAt ?? b.dueAt ?? b.updatedAt;
    return new Date(av).getTime() - new Date(bv).getTime();
  });
}

function sortEventsAscending(events: CalendarEvent[]) {
  return [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}

function sortSessionsDescending(sessions: FocusSession[]) {
  return [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

export function WorkspaceShell({ snapshot }: WorkspaceShellProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("today");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const isReadOnly = snapshot.mode !== "live";

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      document.getElementById("workspace-search")?.focus();
    }
    if (event.key === "Escape" && editingTask) {
      setEditingTask(null);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const filteredTasks = snapshot.tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (!deferredSearch) return true;
    const q = deferredSearch.toLowerCase();
    return (
      task.title.toLowerCase().includes(q) ||
      task.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const tasksInTimeline = sortTasksForTimeline(filteredTasks);
  const upcomingEvents = sortEventsAscending(snapshot.events);
  const recentSessions = sortSessionsDescending(snapshot.focusSessions);

  // Status filter counts
  const statusCounts = snapshot.tasks.reduce(
    (acc, t) => {
      if (t.status === "todo") acc.todo++;
      else if (t.status === "doing") acc.doing++;
      else if (t.status === "done") acc.done++;
      return acc;
    },
    { todo: 0, doing: 0, done: 0 },
  );

  function changeTab(tab: WorkspaceTab) {
    startTransition(() => setActiveTab(tab));
  }

  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 md:px-10">
        <div className="glass rounded-[36px] border border-white/10 px-6 py-6 md:px-8 md:py-8">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <header className="flex flex-col gap-6 border-b border-white/8 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs tracking-[0.18em] uppercase ${
                  snapshot.mode === "live"
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                    : snapshot.mode === "degraded"
                      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                      : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    snapshot.mode === "live"
                      ? "animate-pulse bg-emerald-400"
                      : snapshot.mode === "degraded"
                        ? "bg-amber-400"
                        : "bg-cyan-400"
                  }`}
                />
                {snapshot.mode === "live"
                  ? "Live workspace"
                  : snapshot.mode === "degraded"
                    ? "Degraded mode"
                    : "Demo workspace"}
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-white md:text-5xl">
                  {snapshot.workspace.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                  Cloud workspace · tasks, events, focus sessions synced across all devices.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Signed in as
                  </p>
                  <p className="mt-2 truncate text-lg font-semibold text-white">
                    {snapshot.viewer?.displayName ?? "Anonymous"}
                  </p>
                  <p className="truncate text-sm text-slate-400">
                    {snapshot.viewer?.email ?? "demo mode"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Role
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white capitalize">
                    {snapshot.membershipRole}
                  </p>
                  <p className="text-sm text-slate-400">
                    {snapshot.workspace.timezone}
                  </p>
                </div>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/8 hover:text-slate-200"
                >
                  Sign out
                </button>
              </form>
            </div>
          </header>

          {/* Degraded / issues banner */}
          {snapshot.issues.length > 0 && (
            <div className="mt-6 rounded-3xl border border-amber-300/16 bg-amber-300/10 px-4 py-4 text-sm leading-6 text-amber-50">
              {snapshot.issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          )}

          {/* ── Stat cards ─────────────────────────────────────────────── */}
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Open tasks", value: snapshot.stats.openTasks },
              { label: "Due soon", value: snapshot.stats.dueSoonTasks },
              { label: "Events queued", value: snapshot.stats.scheduledEvents },
              {
                label: "Focus this week",
                value: formatMinutes(snapshot.stats.focusMinutesThisWeek),
              },
              {
                label: "Done this week",
                value: snapshot.stats.completedTasksThisWeek,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="metric-glow rounded-3xl border border-white/10 bg-slate-950/45 p-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {label}
                </p>
                <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </section>

          {/* ── Tab bar + search ───────────────────────────────────────── */}
          <section className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => changeTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-white text-slate-950"
                      : "border border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                id="workspace-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks or tags…"
                className="w-full rounded-full border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40 md:min-w-[260px]"
              />
              <kbd className="hidden rounded-full border border-white/10 bg-white/6 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400 md:block">
                ⌘K
              </kbd>
            </div>
          </section>

          {/* ── Main content + sidebar ─────────────────────────────────── */}
          <section className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="min-w-0 rounded-[30px] border border-white/10 bg-slate-950/48 p-5 md:p-6">

              {/* TODAY */}
              {activeTab === "today" && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-white">
                      Today execution board
                    </h2>
                    {/* Status filter buttons */}
                    <div className="flex gap-1">
                      {(["all", "todo", "doing", "done"] as StatusFilter[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setStatusFilter(f)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            statusFilter === f
                              ? "bg-white/12 text-white"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {STATUS_FILTER_LABELS[f]}
                          {f !== "all" && (
                            <span className="ml-1 opacity-60">
                              {statusCounts[f as keyof typeof statusCounts]}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <TaskCreateForm
                    workspaceId={snapshot.workspace.id}
                    disabled={isReadOnly}
                  />

                  {filteredTasks.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-slate-500">
                        {search
                          ? `No tasks match "${search}"`
                          : "No tasks here yet. Create one above."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {filteredTasks.slice(0, 8).map((task) => (
                        <article
                          key={task.id}
                          className="group relative rounded-3xl border border-white/10 bg-slate-900/70 p-4 transition-colors hover:border-white/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOTS[task.status] ?? "bg-slate-500"}`}
                                />
                                <p className="text-xs capitalize text-slate-400">
                                  {task.status}
                                </p>
                              </div>
                              <h3 className="mt-1.5 text-base font-semibold leading-snug text-white">
                                {task.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_COLORS[task.priority] ?? "text-slate-400 bg-white/6"}`}
                              >
                                {task.priority}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingTask(task)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/0 text-slate-500 transition-all hover:border-white/10 hover:bg-white/8 hover:text-white"
                                aria-label="Edit task"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span>{formatMinutes(task.estimateMinutes)} est.</span>
                            {task.dueAt && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-slate-600" />
                                <span>Due {formatDateTime(task.dueAt)}</span>
                              </>
                            )}
                          </div>

                          {task.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {task.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-white/6 px-2 py-0.5 text-xs text-slate-300"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <TaskCardActions
                            workspaceId={snapshot.workspace.id}
                            task={task}
                            disabled={isReadOnly}
                          />
                        </article>
                      ))}
                    </div>
                  )}

                  {filteredTasks.length > 8 && (
                    <p className="text-center text-xs text-slate-500">
                      Showing 8 of {filteredTasks.length} tasks. Use search to filter.
                    </p>
                  )}
                </div>
              )}

              {/* TIMELINE */}
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-white">
                    Timeline of work
                  </h2>
                  {tasksInTimeline.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-slate-500">No tasks found.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasksInTimeline.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3"
                        >
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOTS[task.status] ?? "bg-slate-500"}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {task.title}
                            </p>
                            <p className="font-mono text-xs text-slate-400">
                              {formatDateTime(task.startAt)} · due{" "}
                              {formatDateTime(task.dueAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {task.tags.length > 0 && (
                              <span className="rounded-full bg-cyan-300/10 px-2.5 py-0.5 text-xs text-cyan-200">
                                {task.tags[0]}
                                {task.tags.length > 1 && ` +${task.tags.length - 1}`}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingTask(task)}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-white/8 hover:text-white"
                              aria-label="Edit task"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CALENDAR */}
              {activeTab === "calendar" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-white">
                      Calendar-grade events
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowEventForm((v) => !v)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        showEventForm
                          ? "bg-white/12 text-white"
                          : "border border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {showEventForm ? "Cancel" : "+ Add event"}
                    </button>
                  </div>

                  {showEventForm && (
                    <EventCreateForm
                      workspaceId={snapshot.workspace.id}
                      timezone={snapshot.workspace.timezone}
                      disabled={isReadOnly}
                      onCreated={() => setShowEventForm(false)}
                    />
                  )}

                  {upcomingEvents.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-slate-500">
                        No events scheduled. Add your first event above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingEvents.map((event) => (
                        <article
                          key={event.id}
                          className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                {event.status}
                              </p>
                              <h3 className="mt-2 text-lg font-semibold text-white">
                                {event.title}
                              </h3>
                            </div>
                            <span className="shrink-0 rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-100">
                              {event.timezone}
                            </span>
                          </div>
                          {event.description && (
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              {event.description}
                            </p>
                          )}
                          <p className="mt-3 font-mono text-xs text-cyan-200">
                            {formatDateRange(event.startAt, event.endAt)}
                          </p>
                          {event.recurrenceRule && (
                            <p className="mt-2 font-mono text-xs text-slate-500">
                              {event.recurrenceRule}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* FOCUS */}
              {activeTab === "focus" && (
                <div className="space-y-6">
                  <FocusTimer
                    workspaceId={snapshot.workspace.id}
                    tasks={snapshot.tasks}
                    settings={snapshot.settings}
                    disabled={isReadOnly}
                  />
                  {recentSessions.length > 0 && (
                    <div className="space-y-3 border-t border-white/8 pt-6">
                      <h3 className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Recent sessions
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {recentSessions.map((session) => (
                          <article
                            key={session.id}
                            className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
                          >
                            <p className="font-mono text-xs text-slate-400">
                              {formatDateTime(session.startedAt)}
                            </p>
                            <p className="mt-2 text-base font-semibold text-white">
                              {formatMinutes(session.actualMinutes)} actual
                              <span className="ml-2 text-slate-500">
                                / {formatMinutes(session.plannedMinutes)} planned
                              </span>
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                              <span>
                                {session.interruptions} interruption
                                {session.interruptions !== 1 ? "s" : ""}
                              </span>
                              {session.breakMinutes > 0 && (
                                <>
                                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                                  <span>{formatMinutes(session.breakMinutes)} break</span>
                                </>
                              )}
                            </div>
                            {session.deviceLabel && (
                              <p className="mt-1.5 text-xs text-cyan-300">
                                {session.deviceLabel}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ANALYTICS */}
              {activeTab === "analytics" && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-white">
                    Honest analytics
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Focus this week
                      </p>
                      <p className="mt-3 text-4xl font-semibold text-white">
                        {formatMinutes(snapshot.stats.focusMinutesThisWeek)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Derived from first-class session rows, not task status guesses.
                      </p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Execution debt
                      </p>
                      <p className="mt-3 text-4xl font-semibold text-white">
                        {Math.max(0, snapshot.stats.openTasks - snapshot.stats.completedTasksThisWeek)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {"Open tasks that haven't been converted into completed work yet."}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Completion rate
                      </p>
                      {(() => {
                        const total =
                          snapshot.stats.openTasks +
                          snapshot.stats.completedTasksThisWeek;
                        const rate =
                          total > 0
                            ? Math.round(
                                (snapshot.stats.completedTasksThisWeek / total) * 100,
                              )
                            : 0;
                        return (
                          <>
                            <p className="mt-3 text-4xl font-semibold text-white">
                              {rate}%
                            </p>
                            <div className="mt-3 h-1.5 rounded-full bg-white/8">
                              <div
                                className="h-1.5 rounded-full bg-emerald-400 transition-all"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              {snapshot.stats.completedTasksThisWeek} done /{" "}
                              {snapshot.stats.openTasks} open
                            </p>
                          </>
                        );
                      })()}
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Sessions this week
                      </p>
                      <p className="mt-3 text-4xl font-semibold text-white">
                        {
                          recentSessions.filter((s) => {
                            const d = new Date(s.startedAt);
                            const now = new Date();
                            const diff =
                              (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
                            return diff <= 7;
                          }).length
                        }
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Number of focus sessions logged in the last 7 days.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <aside className="space-y-4">
              <div className="rounded-[30px] border border-white/10 bg-slate-950/48 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Workspace settings
                </p>
                <div className="mt-4 space-y-2.5 text-sm leading-6 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Daily target</span>
                    <span>{formatMinutes(snapshot.settings.dailyFocusTargetMinutes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Focus block</span>
                    <span>{formatMinutes(snapshot.settings.defaultFocusMinutes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Short break</span>
                    <span>{snapshot.settings.shortBreakMinutes}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Long break</span>
                    <span>{snapshot.settings.longBreakMinutes}m</span>
                  </div>
                </div>
              </div>

              {snapshot.labels.length > 0 && (
                <div className="rounded-[30px] border border-white/10 bg-slate-950/48 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Labels
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {snapshot.labels.map((label) => (
                      <span
                        key={label.id}
                        className="rounded-full px-3 py-1 text-xs font-medium text-white"
                        style={{
                          backgroundColor: `${label.color}33`,
                          border: `1px solid ${label.color}55`,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[30px] border border-white/10 bg-slate-950/48 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Data model
                </p>
                <ul className="mt-4 space-y-2.5 text-sm leading-6 text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    Tasks and events stay separate entities.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    Focus sessions store real execution history.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    Workspace membership drives all access control.
                  </li>
                </ul>
              </div>
            </aside>
          </section>
        </div>
      </main>

      {/* Task edit modal — rendered outside main layout flow */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          workspaceId={snapshot.workspace.id}
          onClose={() => setEditingTask(null)}
          disabled={isReadOnly}
        />
      )}
    </>
  );
}
