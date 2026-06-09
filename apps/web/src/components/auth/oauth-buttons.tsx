"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type OAuthButtonsProps = {
  nextPath: string;
  disabled?: boolean;
};

export function OAuthButtons({
  nextPath,
  disabled = false,
}: OAuthButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function continueWithGoogle() {
    startTransition(async () => {
      try {
        setError(null);

        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (authError) {
          setError(authError.message);
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Không bắt đầu được Google OAuth.",
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={disabled || isPending}
        className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Redirecting..." : "Continue with Google"}
      </button>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
