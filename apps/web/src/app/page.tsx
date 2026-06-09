import Link from "next/link";

const productPillars = [
  {
    title: "Calendar-grade event model",
    body: "Tasks and events are separated. Events carry start, end, timezone, recurrence, and can stay linked to work without becoming the same entity.",
  },
  {
    title: "Notion-like structured task detail",
    body: "Task notes evolve into lightweight blocks for plans, logs, checklists, and review notes so the model stays extensible instead of collapsing into one long string.",
  },
  {
    title: "Pomodoro as real data",
    body: "Focus sessions become first-class records with planned minutes, actual minutes, interruptions, and timestamps, which makes analytics honest across devices.",
  },
];

const freeStack = [
  "Next.js 16 + React 19 + TypeScript",
  "Supabase Auth + Postgres + Realtime + RLS",
  "Vercel free tier for web hosting",
  "Tailwind 4 + Geist typography",
  "Workspace-first schema for multi-device sync",
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 md:px-10">
        <div className="glass grid-fade relative flex flex-1 flex-col overflow-hidden rounded-[36px] border border-white/10 px-6 py-6 md:px-10 md:py-8">
          <header className="flex flex-col gap-6 border-b border-white/8 pb-8 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1 text-xs font-medium tracking-[0.24em] text-cyan-200 uppercase">
                Timeline Focus Cloud
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                A real cloud workspace for tasks, calendar, and focus across every device.
              </h1>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <div className="rounded-3xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-300">
                One account.
                <br />
                One workspace.
                <br />
                Laptop and phone stay in sync.
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-orange-400"
                >
                  Start with magic link
                </Link>
                <Link
                  href="/w/demo-workspace"
                  className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Open product demo
                </Link>
              </div>
            </div>
          </header>

          <div className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="metric-glow rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs tracking-[0.2em] text-slate-400 uppercase">
                    Product mode
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    Cloud-first
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Built for one identity shared on multiple devices instead of local-only task storage.
                  </p>
                </div>
                <div className="metric-glow rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs tracking-[0.2em] text-slate-400 uppercase">
                    Data model
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    Workspace-first
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Workspaces, members, tasks, events, focus sessions, labels, views, settings, and activity logs.
                  </p>
                </div>
                <div className="metric-glow rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs tracking-[0.2em] text-slate-400 uppercase">
                    Cost strategy
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    Free stack
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Modern tech on free tiers first, with room to scale later only when real usage justifies it.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {productPillars.map((pillar, index) => (
                  <article
                    key={pillar.title}
                    className="rounded-[28px] border border-white/10 bg-slate-950/40 p-6"
                  >
                    <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/12 font-mono text-sm text-cyan-200">
                      0{index + 1}
                    </div>
                    <h2 className="text-2xl font-semibold text-white">
                      {pillar.title}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                      {pillar.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="rounded-[28px] border border-orange-400/16 bg-orange-400/10 p-6">
                <p className="text-xs tracking-[0.2em] text-orange-100/80 uppercase">
                  Chosen foundation
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-orange-50">
                  {freeStack.map((item) => (
                    <li key={item} className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-slate-950/50 p-6">
                <p className="text-xs tracking-[0.2em] text-slate-400 uppercase">
                  Migration strategy
                </p>
                <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
                  <p>
                    Legacy <code>users/{'{uid}'}/...</code> data stays as reference first.
                  </p>
                  <p>
                    Each signed-in user gets a default workspace, then tasks, events, and sessions move into workspace tables with rollback preserved.
                  </p>
                  <p>
                    After validation, workspace tables become source of truth and legacy collections become fallback only.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
