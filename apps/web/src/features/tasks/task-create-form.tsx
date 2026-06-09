"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import {
  createTaskAction,
  initialTaskMutationState,
} from "@/features/tasks/actions";
import { useToast } from "@/components/ui/toast";
import type { TaskPriority } from "@/lib/domain/models";

const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

type TaskCreateFormProps = {
  workspaceId: string;
  disabled?: boolean;
};

export function TaskCreateForm({
  workspaceId,
  disabled = false,
}: TaskCreateFormProps) {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(
    createTaskAction,
    initialTaskMutationState,
  );
  // Changing this key causes the form to remount, clearing all inputs
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.status === "success") {
      toast(state.message, "success");
      startTransition(() => setFormKey((k) => k + 1));
    }
  }, [state.status, state.message, toast]);

  return (
    <form
      key={formKey}
      action={formAction}
      className="rounded-[28px] border border-white/10 bg-slate-900/75 p-4"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          name="title"
          required
          disabled={disabled || isPending}
          placeholder="New task title"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
        />
        <select
          name="priority"
          defaultValue="medium"
          disabled={disabled || isPending}
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
        >
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="estimateMinutes"
          defaultValue={50}
          min={5}
          max={480}
          disabled={disabled || isPending}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none md:w-28"
        />
      </div>
      <div className="mt-3 flex flex-col gap-3 md:flex-row">
        <input
          type="datetime-local"
          name="dueAt"
          disabled={disabled || isPending}
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none md:w-64"
        />
        <input
          name="tags"
          disabled={disabled || isPending}
          placeholder="tags: deep-work migration"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={disabled || isPending}
          className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Create task"}
        </button>
      </div>
      {state.status === "error" && state.message ? (
        <p className="mt-3 text-sm text-rose-300">{state.message}</p>
      ) : null}
    </form>
  );
}
