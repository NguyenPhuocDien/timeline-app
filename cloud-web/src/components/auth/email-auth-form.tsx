"use client";

import { useActionState } from "react";
import {
  requestMagicLink,
  type MagicLinkState,
} from "@/app/login/actions";

const initialState: MagicLinkState = {
  status: "idle",
  message: "",
};

type EmailAuthFormProps = {
  nextPath: string;
  disabled?: boolean;
};

export function EmailAuthForm({
  nextPath,
  disabled = false,
}: EmailAuthFormProps) {
  const [state, formAction, isPending] = useActionState(
    requestMagicLink,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-xs font-medium tracking-[0.18em] text-slate-400 uppercase"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={disabled || isPending}
          placeholder="you@workspace.app"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || isPending}
        className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending magic link..." : "Continue with magic link"}
      </button>
      {state.message ? (
        <p
          className={`text-sm leading-6 ${
            state.status === "error" ? "text-rose-300" : "text-emerald-300"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
