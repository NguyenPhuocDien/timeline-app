export default function WorkspaceLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 md:px-10">
      <div className="glass animate-pulse rounded-[36px] border border-white/10 px-6 py-6 md:px-8 md:py-8">
        <div className="h-10 w-64 rounded-full bg-white/8" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="h-28 rounded-3xl bg-white/8" />
          <div className="h-28 rounded-3xl bg-white/8" />
          <div className="h-28 rounded-3xl bg-white/8" />
        </div>
        <div className="mt-8 h-[420px] rounded-[30px] bg-white/8" />
      </div>
    </main>
  );
}
