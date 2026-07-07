import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Bot,
  Brain,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Database,
  GitBranch,
  Hotel,
  Map,
  MessageSquareText,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const workflow = [
  { label: 'Understand', desc: 'Extract intent, destination, dates, budget, and travel style.', icon: Brain },
  { label: 'Search', desc: 'Collect real place context before building the itinerary.', icon: Search },
  { label: 'Plan', desc: 'Generate a day-by-day schedule with logistics and costs.', icon: CalendarDays },
  { label: 'Check', desc: 'Validate time, budget, coordinates, and booking constraints.', icon: ShieldCheck },
  { label: 'Remember', desc: 'Save useful preferences for future trip recommendations.', icon: Database },
];

const modules = [
  {
    title: 'AI trip planner',
    desc: 'Natural-language planning and guided form input feed the same agent workflow.',
    icon: Bot,
  },
  {
    title: 'Interactive itinerary',
    desc: 'Timeline, status tracking, drag-and-drop ordering, and trip collaboration.',
    icon: Route,
  },
  {
    title: 'Dark route map',
    desc: 'Daily routes, location markers, invalid-coordinate filtering, and map popups.',
    icon: Map,
  },
  {
    title: 'Smart budget',
    desc: 'Budget totals, category breakdowns, and per-activity cost analysis.',
    icon: CircleDollarSign,
  },
  {
    title: 'Booking simulation',
    desc: 'Flight and hotel suggestions with mock booking confirmation for demo flow.',
    icon: Hotel,
  },
  {
    title: 'Travel memory',
    desc: 'User preferences are stored and reused to personalize future plans.',
    icon: MessageSquareText,
  },
];

const proofPoints = [
  'FastAPI backend with PostgreSQL and pgvector memory',
  'LangGraph supervisor routes planning, info, and booking agents',
  'Next.js frontend with map, budget, calendar, tours, and collaboration',
  'WebSocket chat streams assistant progress in real time',
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight">TravelAI</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <Link href="#workflow" className="hover:text-white transition-colors">Workflow</Link>
            <Link href="#modules" className="hover:text-white transition-colors">Modules</Link>
            <Link href="#architecture" className="hover:text-white transition-colors">Architecture</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white sm:block">
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-indigo-100"
            >
              Start planning
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[92vh] overflow-hidden">
        <Image
          src="/destinations/hoian.jpg"
          alt="Hoi An lantern street"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-slate-950/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/15 via-transparent to-slate-950" />

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-4 pb-24 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-100 backdrop-blur-md">
              <GitBranch className="h-4 w-4 text-indigo-200" />
              Agentic Travel AI
            </div>
            <h1 className="font-heading text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              AI Travel Assistant
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              A complete thesis demo for planning trips with an AI assistant that understands user intent,
              searches travel context, builds itineraries, checks constraints, and keeps useful memory.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-950/40 transition hover:bg-indigo-400"
              >
                Create a trip
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
              >
                Open demo workspace
              </Link>
            </div>
          </div>

          <div className="mt-10 grid max-w-4xl grid-cols-1 gap-3 sm:mt-14 sm:grid-cols-3">
            {[
              ['Planner', 'Natural language and guided form'],
              ['Assistant', 'Streaming chat with agent routing'],
              ['Trip tools', 'Map, budget, booking, sharing'],
            ].map(([label, value]) => (
              <div key={label} className="border-l border-indigo-300/50 bg-slate-950/35 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">{label}</p>
                <p className="mt-1 text-sm text-slate-200">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-white/10 bg-slate-900 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">How the assistant works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              From a messy travel request to a structured itinerary
            </h2>
            <p className="mt-4 text-slate-400">
              The system is designed around an agent workflow, so the demo can show reasoning steps,
              tool usage, persistence, and user-facing trip management.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-5">
            {workflow.map(({ label, desc, icon: Icon }, index) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-600">0{index + 1}</span>
                </div>
                <h3 className="font-semibold text-white">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="bg-slate-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Demo scope</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Built as an assistant, not just a trip generator
              </h2>
            </div>
            <Link href="/register" className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              Try the planner
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ title, desc, icon: Icon }) => (
              <div key={title} className="rounded-lg border border-white/10 bg-slate-900/70 p-6 transition hover:border-indigo-400/35 hover:bg-slate-900">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-indigo-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="architecture" className="bg-slate-900 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Implementation</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              A realistic full-stack travel assistant architecture
            </h2>
            <p className="mt-4 text-slate-400">
              The project combines agent orchestration, persistent user data, map visualization,
              booking simulation, and real-time chat in one coherent workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['Next.js', 'FastAPI', 'LangGraph', 'PostgreSQL', 'pgvector', 'WebSocket'].map((tech) => (
                <span key={tech} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950 p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white">What the demo can prove</h3>
                <p className="text-sm text-slate-500">Concrete capabilities visible in the running app</p>
              </div>
            </div>
            <div className="space-y-4">
              {proofPoints.map((point) => (
                <div key={point} className="flex gap-3 text-sm leading-6 text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-300" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-8 border-y border-white/10 py-12 md:flex-row md:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-indigo-300">
                <Users className="h-4 w-4" />
                Ready for the demo
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Plan, inspect, revise, and present a complete trip.</h2>
              <p className="mt-3 max-w-2xl text-slate-400">
                Start with a destination request, then use the assistant, map, budget, and booking simulation
                to show the full travel-planning lifecycle.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 font-semibold text-white transition hover:bg-indigo-400"
            >
              Start planning
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:px-6 md:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            <span className="font-semibold text-slate-300">TravelAI</span>
          </div>
          <p>AI Travel Assistant thesis demo, 2026.</p>
        </div>
      </footer>
    </main>
  );
}
