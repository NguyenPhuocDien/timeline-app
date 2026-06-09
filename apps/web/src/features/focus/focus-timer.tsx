"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  initialSaveFocusSessionState,
  saveFocusSessionAction,
} from "./actions";
import { useToast } from "@/components/ui/toast";
import type { Task, WorkspaceSettings } from "@/lib/domain/models";

type TimerStatus = "idle" | "running" | "paused" | "done";

interface SessionSnapshot {
  startedAt: string;
  endedAt: string;
  actualMinutes: number;
  plannedMinutes: number;
  interruptions: number;
  taskId: string | null;
  deviceLabel: string;
}

interface FocusTimerProps {
  workspaceId: string;
  tasks: Task[];
  settings: WorkspaceSettings;
  disabled?: boolean;
}

const PRESET_DURATIONS = [25, 50, 90];

function detectDevice(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile/.test(ua)) return "Mobile";
  if (/tablet|ipad/.test(ua)) return "Tablet";
  return "Desktop";
}

function padTwo(n: number) {
  return n.toString().padStart(2, "0");
}

function minutesToDisplay(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${padTwo(m)}:${padTwo(s)}`;
}

export function FocusTimer({
  workspaceId,
  tasks,
  settings,
  disabled = false,
}: FocusTimerProps) {
  const { toast } = useToast();

  const [saveState, saveAction, isPending] = useActionState(
    saveFocusSessionAction,
    initialSaveFocusSessionState,
  );

  // ── Timer config ────────────────────────────────────────────────────────────
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [plannedMinutes, setPlannedMinutes] = useState(
    settings.defaultFocusMinutes,
  );

  // ── Timer runtime state (triggers re-renders) ────────────────────────────
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [interruptionCount, setInterruptionCount] = useState(0);
  const [session, setSession] = useState<SessionSnapshot | null>(null);

  // ── Timer internals (refs, no re-render needed) ──────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string>("");
  // Epoch ms when the current running period began
  const periodStartEpochRef = useRef<number>(0);
  // Seconds accumulated from previous completed periods (before pauses)
  const accumulatedSecondsRef = useRef<number>(0);
  const interruptionCountRef = useRef<number>(0);
  const plannedMinutesRef = useRef<number>(settings.defaultFocusMinutes);
  const selectedTaskIdRef = useRef<string>("");

  // Keep refs in sync with state so interval callback has fresh values
  useEffect(() => {
    interruptionCountRef.current = interruptionCount;
  }, [interruptionCount]);
  useEffect(() => {
    plannedMinutesRef.current = plannedMinutes;
  }, [plannedMinutes]);
  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  // ── React to save action result ──────────────────────────────────────────
  useEffect(() => {
    if (saveState.status === "success") {
      toast(saveState.message, "success");
      resetTimer();
    } else if (saveState.status === "error" && saveState.message) {
      toast(saveState.message, "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function clearTick() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function computeActualSeconds(currentStatus: TimerStatus): number {
    if (currentStatus === "running") {
      const elapsed = Math.round(
        (Date.now() - periodStartEpochRef.current) / 1000,
      );
      return accumulatedSecondsRef.current + elapsed;
    }
    return accumulatedSecondsRef.current;
  }

  function buildSnapshot(): SessionSnapshot {
    const actualSeconds = computeActualSeconds("running");
    return {
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
      actualMinutes: Math.max(1, Math.round(actualSeconds / 60)),
      plannedMinutes: plannedMinutesRef.current,
      interruptions: interruptionCountRef.current,
      taskId: selectedTaskIdRef.current || null,
      deviceLabel: detectDevice(),
    };
  }

  function startTick(remainingSeconds: number) {
    periodStartEpochRef.current = Date.now();
    setTimeLeft(remainingSeconds);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTick();
          // Use timeout so state update (setTimeLeft(0)) commits first
          setTimeout(() => {
            const snap = buildSnapshot();
            setSession(snap);
            setTimerStatus("done");
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  function handleStart() {
    if (disabled || plannedMinutes < 1) return;
    startedAtRef.current = new Date().toISOString();
    accumulatedSecondsRef.current = 0;
    interruptionCountRef.current = 0;
    setInterruptionCount(0);
    setSession(null);
    setTimerStatus("running");
    startTick(plannedMinutes * 60);
  }

  function handlePause() {
    clearTick();
    const elapsed = Math.round(
      (Date.now() - periodStartEpochRef.current) / 1000,
    );
    accumulatedSecondsRef.current += elapsed;
    setTimerStatus("paused");
  }

  function handleResume() {
    setInterruptionCount((prev) => {
      const next = prev + 1;
      interruptionCountRef.current = next;
      return next;
    });
    setTimerStatus("running");
    startTick(timeLeft);
  }

  function handleEndSession() {
    clearTick();
    const snap = buildSnapshot();
    setSession(snap);
    setTimerStatus("done");
  }

  function resetTimer() {
    clearTick();
    accumulatedSecondsRef.current = 0;
    interruptionCountRef.current = 0;
    setTimerStatus("idle");
    setTimeLeft(0);
    setInterruptionCount(0);
    setSession(null);
  }

  const activeTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "archived",
  );

  const totalDurationSeconds = plannedMinutes * 60;
  const progressPercent =
    timerStatus === "idle" || totalDurationSeconds === 0
      ? 0
      : Math.min(
          100,
          ((totalDurationSeconds - timeLeft) / totalDurationSeconds) * 100,
        );

  // ── Render: IDLE ─────────────────────────────────────────────────────────
  if (timerStatus === "idle") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Focus timer</h2>
          <p className="mt-1 text-sm text-slate-400">
            Chọn task và bắt đầu một phiên Pomodoro-style.
          </p>
        </div>

        {disabled ? (
          <div className="rounded-2xl border border-amber-300/16 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
            Focus timer cần live workspace. Đăng nhập để bắt đầu theo dõi sessions.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Task muốn focus (không bắt buộc)
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
              >
                <option value="">Không gắn với task nào</option>
                {activeTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    [{task.priority}] {task.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Thời lượng
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_DURATIONS.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setPlannedMinutes(min)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      plannedMinutes === min
                        ? "border border-cyan-400/40 bg-cyan-400/20 text-cyan-100"
                        : "border border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {min}m
                  </button>
                ))}
                <input
                  type="number"
                  value={plannedMinutes}
                  onChange={(e) =>
                    setPlannedMinutes(
                      Math.max(1, Math.min(240, Number(e.target.value))),
                    )
                  }
                  min={1}
                  max={240}
                  className="w-20 rounded-full border border-white/10 bg-slate-950/60 px-3 py-2 text-center text-sm text-white outline-none focus:border-cyan-300/40"
                />
                <span className="text-sm text-slate-500">phút tùy chỉnh</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="w-full rounded-full bg-cyan-500 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-cyan-400"
            >
              Bắt đầu {plannedMinutes} phút focus
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Render: RUNNING / PAUSED ─────────────────────────────────────────────
  if (timerStatus === "running" || timerStatus === "paused") {
    const focusedTask = activeTasks.find((t) => t.id === selectedTaskId);

    return (
      <div className="space-y-6">
        <div>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${
              timerStatus === "running"
                ? "border-cyan-400/25 bg-cyan-400/12 text-cyan-200"
                : "border-amber-400/25 bg-amber-400/12 text-amber-200"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                timerStatus === "running" ? "animate-pulse bg-cyan-400" : "bg-amber-400"
              }`}
            />
            {timerStatus === "running" ? "Đang focus" : "Tạm dừng"}
          </div>
          {focusedTask && (
            <p className="mt-3 text-base font-medium text-white">
              {focusedTask.title}
            </p>
          )}
        </div>

        {/* Timer ring + display */}
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative flex h-44 w-44 items-center justify-center">
            {/* SVG ring */}
            <svg
              className="-rotate-90 absolute inset-0"
              viewBox="0 0 180 180"
              fill="none"
            >
              <circle
                cx="90"
                cy="90"
                r="82"
                stroke="white"
                strokeOpacity="0.06"
                strokeWidth="8"
              />
              <circle
                cx="90"
                cy="90"
                r="82"
                stroke={timerStatus === "running" ? "#22d3ee" : "#fbbf24"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 82}`}
                strokeDashoffset={`${2 * Math.PI * 82 * (1 - progressPercent / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>

            <div className="text-center">
              <p className="font-mono text-4xl font-semibold tracking-tight text-white">
                {minutesToDisplay(timeLeft)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                {timerStatus === "running" ? "remaining" : "paused"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>
              {interruptionCount} interruption
              {interruptionCount !== 1 ? "s" : ""}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>{plannedMinutes}m planned</span>
          </div>
        </div>

        <div className="flex gap-3">
          {timerStatus === "running" ? (
            <button
              type="button"
              onClick={handlePause}
              className="flex-1 rounded-full border border-white/12 bg-white/6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Tạm dừng
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResume}
              className="flex-1 rounded-full bg-cyan-500 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Tiếp tục
            </button>
          )}
          <button
            type="button"
            onClick={handleEndSession}
            className="flex-1 rounded-full border border-red-400/20 bg-red-400/10 py-3 text-sm font-semibold text-red-100 hover:bg-red-400/20"
          >
            Kết thúc
          </button>
        </div>
      </div>
    );
  }

  // ── Render: DONE ─────────────────────────────────────────────────────────
  if (timerStatus === "done" && session) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-white">Session xong!</h2>
          <p className="mt-1 text-sm text-slate-400">
            Lưu vào lịch sử focus để analytics chính xác.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Planned
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {session.plannedMinutes}m
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-400/16 bg-cyan-400/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
              Actual
            </p>
            <p className="mt-2 text-2xl font-semibold text-cyan-100">
              {session.actualMinutes}m
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Interruptions
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {session.interruptions}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Device
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {session.deviceLabel}
            </p>
          </div>
        </div>

        {!disabled ? (
          <form action={saveAction} className="space-y-3">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input
              type="hidden"
              name="taskId"
              value={session.taskId ?? "none"}
            />
            <input
              type="hidden"
              name="plannedMinutes"
              value={session.plannedMinutes}
            />
            <input
              type="hidden"
              name="actualMinutes"
              value={session.actualMinutes}
            />
            <input type="hidden" name="breakMinutes" value={0} />
            <input
              type="hidden"
              name="interruptions"
              value={session.interruptions}
            />
            <input type="hidden" name="startedAt" value={session.startedAt} />
            <input type="hidden" name="endedAt" value={session.endedAt} />
            <input
              type="hidden"
              name="deviceLabel"
              value={session.deviceLabel}
            />

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-full bg-cyan-500 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-cyan-400 disabled:opacity-60"
              >
                {isPending ? "Đang lưu…" : "Lưu session"}
              </button>
              <button
                type="button"
                onClick={resetTimer}
                className="rounded-full border border-white/10 bg-white/6 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
              >
                Bỏ qua
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={resetTimer}
            className="w-full rounded-full border border-white/10 bg-white/6 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Bắt đầu session mới
          </button>
        )}
      </div>
    );
  }

  return null;
}
