"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import {
  createEventAction,
  initialEventMutationState,
} from "./actions";
import { useToast } from "@/components/ui/toast";

interface EventCreateFormProps {
  workspaceId: string;
  timezone: string;
  disabled?: boolean;
  onCreated?: () => void;
}

export function EventCreateForm({
  workspaceId,
  timezone,
  disabled = false,
  onCreated,
}: EventCreateFormProps) {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(
    createEventAction,
    initialEventMutationState,
  );
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.status === "success") {
      toast(state.message, "success");
      startTransition(() => setFormKey((k) => k + 1));
      onCreated?.();
    } else if (state.status === "error" && state.message) {
      toast(state.message, "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.message]);

  if (disabled) {
    return (
      <div className="rounded-2xl border border-amber-300/16 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
        Tạo event cần live workspace. Đây là demo mode.
      </div>
    );
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="space-y-4 rounded-[28px] border border-white/10 bg-slate-900/75 p-5"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="timezone" value={timezone} />

      <h3 className="text-sm font-semibold text-white">New event</h3>

      {/* Title */}
      <input
        name="title"
        required
        disabled={isPending}
        placeholder="Event title *"
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40 disabled:opacity-60"
      />

      {/* Description */}
      <textarea
        name="description"
        disabled={isPending}
        placeholder="Description (optional)"
        rows={2}
        className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40 disabled:opacity-60"
      />

      {/* Start + End */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Start *
          </label>
          <input
            type="datetime-local"
            name="startAt"
            required
            disabled={isPending}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40 disabled:opacity-60"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
            End *
          </label>
          <input
            type="datetime-local"
            name="endAt"
            required
            disabled={isPending}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Timezone: <span className="text-slate-400">{timezone}</span>
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create event"}
        </button>
      </div>

      {state.status === "error" && state.message ? (
        <p className="text-sm text-rose-300">{state.message}</p>
      ) : null}
    </form>
  );
}
