import { redirect } from "next/navigation";
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
      </div>
    </main>
  );
}
