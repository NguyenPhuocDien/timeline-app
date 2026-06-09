import { archiveTaskAction, updateTaskStatusAction } from "@/features/tasks/actions";
import type { Task } from "@/lib/domain/models";

type TaskCardActionsProps = {
  workspaceId: string;
  task: Task;
  disabled?: boolean;
};

export function TaskCardActions({
  workspaceId,
  task,
  disabled = false,
}: TaskCardActionsProps) {
  if (disabled) {
    return (
      <div className="mt-4 text-xs text-slate-500">
        Live task actions are disabled in demo mode.
      </div>
    );
  }

  const nextStatus = task.status === "done" ? "doing" : "done";

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <form action={updateTaskStatusAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="nextStatus" value={nextStatus} />
        <button
          type="submit"
          className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-medium text-cyan-100"
        >
          {task.status === "done" ? "Re-open" : "Mark done"}
        </button>
      </form>

      {task.status !== "doing" ? (
        <form action={updateTaskStatusAction}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="nextStatus" value="doing" />
          <button
            type="submit"
            className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-medium text-white"
          >
            Move to doing
          </button>
        </form>
      ) : null}

      <form action={archiveTaskAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="taskId" value={task.id} />
        <button
          type="submit"
          className="rounded-full border border-rose-300/18 bg-rose-300/10 px-3 py-2 text-xs font-medium text-rose-200"
        >
          Archive
        </button>
      </form>
    </div>
  );
}
