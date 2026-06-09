"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  deleteTaskAction,
  initialTaskMutationState,
  updateTaskAction,
} from "./actions";
import { useToast } from "@/components/ui/toast";
import { taskPriorities, taskStatuses } from "@/lib/domain/models";
import type { Task } from "@/lib/domain/models";

interface TaskEditModalProps {
  task: Task;
  workspaceId: string;
  onClose: () => void;
  disabled?: boolean;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To do",
  doing: "Doing",
  done: "Done",
  archived: "Archived",
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export function TaskEditModal({
  task,
  workspaceId,
  onClose,
  disabled = false,
}: TaskEditModalProps) {
  const { toast } = useToast();
  const [saveState, saveAction, isSaving] = useActionState(
    updateTaskAction,
    initialTaskMutationState,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Animate in on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Handle save success/error
  useEffect(() => {
    if (saveState.status === "success") {
      toast(saveState.message, "success");
      handleClose();
    } else if (saveState.status === "error" && saveState.message) {
      toast(saveState.message, "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState]);

  function handleClose() {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) handleClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-end"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-900 transition-transform duration-200 ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Edit task
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-white">
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {disabled ? (
            <div className="rounded-2xl border border-amber-300/16 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              Chỉnh sửa task cần live workspace. Đây là demo mode.
            </div>
          ) : (
            <form action={saveAction} className="space-y-5">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="taskId" value={task.id} />

              {/* Title */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Title *
                </label>
                <input
                  name="title"
                  required
                  defaultValue={task.title}
                  disabled={isSaving}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40 disabled:opacity-60"
                />
              </div>

              {/* Priority + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue={task.priority}
                    disabled={isSaving}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
                  >
                    {taskPriorities.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={task.status}
                    disabled={isSaving}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
                  >
                    {taskStatuses.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimate + Energy */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Estimate (min)
                  </label>
                  <input
                    type="number"
                    name="estimateMinutes"
                    defaultValue={task.estimateMinutes}
                    min={5}
                    max={480}
                    disabled={isSaving}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Energy (1–5)
                  </label>
                  <input
                    type="number"
                    name="energy"
                    defaultValue={task.energy}
                    min={1}
                    max={5}
                    disabled={isSaving}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Start + Due */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Start date
                </label>
                <input
                  type="datetime-local"
                  name="startAt"
                  defaultValue={toDatetimeLocal(task.startAt)}
                  disabled={isSaving}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Due date
                </label>
                <input
                  type="datetime-local"
                  name="dueAt"
                  defaultValue={toDatetimeLocal(task.dueAt)}
                  disabled={isSaving}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40 disabled:opacity-60"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Tags
                </label>
                <input
                  name="tags"
                  defaultValue={task.tags.join(" ")}
                  disabled={isSaving}
                  placeholder="deep-work migration design"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40 disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-full bg-cyan-500 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            </form>
          )}
        </div>

        {/* Footer — Delete */}
        {!disabled && (
          <div className="border-t border-white/8 px-6 py-4">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full rounded-full border border-red-400/20 bg-red-400/8 py-2.5 text-sm font-medium text-red-300 hover:bg-red-400/16"
              >
                Delete task
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-xs text-slate-400">
                  This will permanently delete the task.
                </p>
                <div className="flex gap-2">
                  <form
                    action={deleteTaskAction}
                    onSubmit={handleClose}
                    className="flex-1"
                  >
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="taskId" value={task.id} />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-400"
                    >
                      Yes, delete
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-full border border-white/10 bg-white/6 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
