import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createDemoWorkspaceSnapshot } from "@/lib/workspace/demo";
import { getWorkspaceSnapshot } from "@/lib/workspace/queries";
import { hasSupabaseEnv } from "@/lib/env";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export async function generateMetadata({
  params,
}: WorkspacePageProps): Promise<Metadata> {
  const { workspaceId } = await params;
  return {
    title:
      workspaceId === "demo-workspace"
        ? "Demo Workspace"
        : "Workspace",
  };
}

export default async function WorkspacePage({
  params,
}: WorkspacePageProps) {
  const { workspaceId } = await params;

  const snapshot =
    workspaceId === "demo-workspace" || !hasSupabaseEnv()
      ? createDemoWorkspaceSnapshot(workspaceId)
      : await getWorkspaceSnapshot(workspaceId);

  if (!snapshot) {
    redirect(`/login?next=${encodeURIComponent(`/w/${workspaceId}`)}`);
  }

  return <WorkspaceShell snapshot={snapshot} />;
}
