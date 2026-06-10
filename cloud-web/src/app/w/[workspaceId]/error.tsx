"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[WorkspaceError]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/8 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-300/70">
            Workspace error
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            Workspace failed to load
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {error.message ||
              "Something went wrong while loading your workspace. Your data is safe."}
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-slate-500">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-full bg-cyan-500 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Try again
          </button>
          <Link
            href="/app"
            className="flex-1 rounded-full border border-white/10 bg-white/6 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
          >
            Back to app
          </Link>
        </div>
      </div>
    </main>
  );
}
