import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/features/auth/actions";
import { hasSupabaseEnv } from "@/lib/env";
import { getAuthViewer } from "@/lib/workspace/queries";

export default async function AppEntryPage() {
  if (!hasSupabaseEnv()) {
    redirect("/w/demo-workspace");
  }

  const viewer = await getAuthViewer();

  if (!viewer) {
    redirect("/login?next=/app");
  }

  if (viewer.defaultWorkspaceId) {
    redirect(`/w/${viewer.defaultWorkspaceId}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-8">
      <div className="glass rounded-[32px] border border-white/10 p-8 text-center">
        <h1 className="text-3xl font-semibold text-white">
          Workspace bootstrap is incomplete
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          The account is signed in, but no default workspace has been attached yet. Run the Supabase SQL bootstrap to create automatic personal workspaces.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/app"
            className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Retry workspace
          </Link>
          <Link
            href="/api/health"
            className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Check health
          </Link>
          <Link
            href="/w/demo-workspace"
            className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Open demo
          </Link>
        </div>
        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="rounded-full px-5 py-2 text-sm font-medium text-slate-400 hover:text-white"
          >
            Sign out and try another account
          </button>
        </form>
      </div>
    </main>
  );
}
