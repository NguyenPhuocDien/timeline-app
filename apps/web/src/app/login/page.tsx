import type { Metadata } from "next";
import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/env";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to the same workspace from every device.",
};

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/app";
  const authReady = hasSupabaseEnv();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-8 md:px-10">
      <div className="glass grid w-full gap-8 rounded-[36px] border border-white/10 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <section className="space-y-6 rounded-[28px] border border-white/10 bg-slate-950/45 p-6">
          <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100">
            Multi-device auth
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Sign in once and keep one workspace across phone and laptop.
          </h1>
          <p className="max-w-xl text-sm leading-7 text-slate-300 md:text-base">
            The new product is built around a shared workspace, so your account becomes the identity anchor and Postgres becomes the source of truth.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
              Magic link is the fastest free auth path.
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
              Google OAuth is available once the provider is enabled in Supabase.
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
              Row Level Security keeps every workspace isolated.
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Authentication
          </p>
          <div className="mt-6 space-y-5">
            {!authReady ? (
              <div className="rounded-3xl border border-amber-300/16 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                Supabase env chưa được cấu hình, nên auth thật đang tắt. Bạn vẫn có thể vào demo workspace để xem product shell.
              </div>
            ) : null}

            <EmailAuthForm nextPath={nextPath} disabled={!authReady} />

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
              <span className="h-px flex-1 bg-white/8" />
              or
              <span className="h-px flex-1 bg-white/8" />
            </div>

            <OAuthButtons nextPath={nextPath} disabled={!authReady} />

            <div className="rounded-3xl border border-white/10 bg-white/6 p-4 text-sm leading-6 text-slate-300">
              Need a working surface first?
              <div className="mt-3">
                <Link
                  href="/w/demo-workspace"
                  className="inline-flex rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white"
                >
                  Open demo workspace
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
