'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getTrips, deleteTrip, generateTrip, getMe } from '@/lib/api';
import type { Trip, User } from '@/types';
import dynamic from 'next/dynamic';
import { Bot, CalendarDays, CircleDollarSign, Compass, Map, Plane, Plus, Route, Sparkles, Loader2 } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import StatsCard from '@/components/StatsCard';
import TripCard from '@/components/TripCard';
import ActivityFeed from '@/components/ActivityFeed';

import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { formatCurrency, getAppCurrency, normalizeToVND } from '@/lib/currency';

const GuidedPlanner = dynamic(() => import('@/components/GuidedPlanner'), { ssr: false });
const PopularDestinations = dynamic(() => import('@/components/PopularDestinations'), { ssr: false });

// ─── Travel Styles data ───────────────────────────────────────────────────────

const TRAVEL_STYLES = [
  { label: 'Adventure' },
  { label: 'Nature' },
  { label: 'Food' },
  { label: 'Photography' },
  { label: 'Coffee' },
  { label: 'Culture' },
  { label: 'Beach' },
  { label: 'Luxury' },
  { label: 'Shopping' },
  { label: 'Nightlife' },
];

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const time = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
  return `Good ${time}, ${name} 👋`;
}

// ─── Inner component (uses useSearchParams, needs Suspense parent) ─────────────

export default function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTripMsg, setNewTripMsg] = useState('');
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'guided'>('ai');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [guidedDestination, setGuidedDestination] = useState('');
  const [guidedKey, setGuidedKey] = useState(0); // force re-mount when dest changes externally
  const [deletingTripId, setDeletingTripId] = useState<number | null>(null);

  const plannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    loadTrips();
    getMe().then((data) => setUser(data as User)).catch(() => {});

    // Support query params from sidebar / explore page
    const tab = searchParams.get('tab');
    const dest = searchParams.get('dest');
    if (tab === 'guided') setActiveTab('guided');
    else if (tab === 'ai') setActiveTab('ai');
    if (dest) {
      setGuidedDestination(decodeURIComponent(dest));
      setActiveTab('guided');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTrips() {
    try {
      const data = await getTrips() as Trip[];
      setTrips(data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  // ── Existing AI generation logic (unchanged) ────────────────────────────────
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTripMsg.trim()) return;
    
    let finalPrompt = newTripMsg.trim();
    if (selectedStyles.length > 0) {
      finalPrompt += `\n\nPlease tailor this trip specifically for these travel styles/interests: ${selectedStyles.join(', ')}.`;
    }

    setGenerating(true);
    try {
      const result = await generateTrip(finalPrompt) as { trip?: { id?: number } };
      setNewTripMsg('');
      await loadTrips();
      if (result?.trip?.id) router.push(`/trips/${result.trip.id}`);
    } finally {
      setGenerating(false);
    }
  }

  // ── Guided planner uses the same generateTrip API ───────────────────────────
  async function handleGuidedGenerate(prompt: string) {
    let finalPrompt = prompt;
    if (selectedStyles.length > 0) {
      finalPrompt += `\n\nPlease tailor this trip specifically for these travel styles/interests: ${selectedStyles.join(', ')}.`;
    }

    setGenerating(true);
    try {
      const result = await generateTrip(finalPrompt) as { trip?: { id?: number } };
      await loadTrips();
      if (result?.trip?.id) router.push(`/trips/${result.trip.id}`);
    } finally {
      setGenerating(false);
    }
  }

  function handleDeleteRequest(id: number) {
    setDeletingTripId(id);
  }

  async function handleConfirmDelete() {
    if (!deletingTripId) return;
    await deleteTrip(deletingTripId);
    setTrips(trips.filter((t) => t.id !== deletingTripId));
    setDeletingTripId(null);
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    router.push('/login');
  }

  function toggleStyle(label: string) {
    setSelectedStyles(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  }

  function handleDestinationSelect(name: string) {
    setGuidedDestination(name);
    setGuidedKey(k => k + 1); // force GuidedPlanner to re-mount with new prefill
    setActiveTab('guided');
    setTimeout(() => {
      plannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // ── Derived stats ───────────────────────────────────────────────────────────
  const totalBudget = trips.reduce((sum, t) => sum + normalizeToVND(t.total_budget, t.currency), 0);
  const activeTrips = trips.filter(t => t.status === 'ACTIVE').length;
  const uniqueDestinations = new Set(trips.map(t => t.destination.split(',')[0].trim())).size;
  
  const [_, setForceRender] = useState(0);
  useEffect(() => {
    const handler = () => setForceRender(r => r + 1);
    window.addEventListener('currencyChange', handler);
    return () => window.removeEventListener('currencyChange', handler);
  }, []);

  const displayName = (user?.travel_profile as any)?.name || user?.email?.split('@')[0] || 'Traveler';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 flex">
      {/* Sidebar */}
      <Sidebar
        recentTrips={trips.map(t => ({ id: t.id, title: t.title, destination: t.destination }))}
        onDeleteTrip={handleDeleteRequest}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <nav className="border-b border-white/8 bg-black/20 backdrop-blur-xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="lg:hidden w-10" />
          <div className="hidden lg:block" />
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              id="profile-avatar-link"
              title={user?.email ?? 'Profile'}
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600/60 to-violet-600/60 border border-indigo-500/60 flex items-center justify-center hover:border-indigo-400 transition">
                <span className="text-sm font-bold text-indigo-200">
                  {user?.email?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <span className="text-slate-400 group-hover:text-white text-sm transition hidden sm:block">
                {user?.email ?? ''}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 text-sm transition"
            >
              Sign out
            </button>
          </div>
        </nav>

        {/* Page body */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

            {/* ── Welcome ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between">
              <div>
                <h1 suppressHydrationWarning className="text-3xl font-bold text-white mb-1">
                  {getGreeting(displayName)}
                </h1>
                <p className="text-slate-400">
                  {trips.length > 0
                    ? `You have ${trips.length} trip${trips.length > 1 ? 's' : ''} planned${activeTrips > 0 ? ` · ${activeTrips} active` : ''}.`
                    : "Let's plan your first trip."}
                </p>
              </div>
              <button
                onClick={() => { setActiveTab('ai'); setTimeout(() => plannerRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 hover:text-white transition-all duration-300 transform hover:scale-105 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                New Trip
              </button>
            </div>

            {/* ── Stats Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard icon={<Plane className="h-5 w-5" />} label="Trips Planned" value={trips.length} gradient="bg-gradient-to-br from-indigo-600 to-violet-600" />
              <StatsCard icon={<Compass className="h-5 w-5" />} label="Destinations" value={uniqueDestinations} gradient="bg-gradient-to-br from-emerald-600 to-teal-600" />
              <StatsCard icon={<Route className="h-5 w-5" />} label="Active Trips" value={activeTrips} gradient="bg-gradient-to-br from-amber-600 to-orange-600" />
              <StatsCard
                icon={<CircleDollarSign className="h-5 w-5" />}
                label="Total Budget"
                value={totalBudget > 0 ? formatCurrency(totalBudget, 'VND') : '—'}
                gradient="bg-gradient-to-br from-sky-600 to-cyan-600"
              />
            </div>

            {/* ── Planner Tabs ──────────────────────────────────────────────── */}
            <div ref={plannerRef}>
              <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/8 w-fit mb-6">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'ai'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2"><Bot className="h-4 w-4" /> AI Planner</span>
                </button>
                <button
                  onClick={() => setActiveTab('guided')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'guided'
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2"><Map className="h-4 w-4" /> Guided Planner</span>
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                {activeTab === 'ai' ? (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Plan with AI</h2>
                    <p className="text-slate-400 text-sm mb-5">
                      Describe your dream trip in natural language and let AI do all the planning.
                    </p>
                    <form onSubmit={handleGenerate} className="space-y-3">
                      <textarea
                        value={newTripMsg}
                        onChange={(e) => setNewTripMsg(e.target.value)}
                        rows={3}
                        placeholder="e.g. Plan a 5-day trip to Tokyo with a $1000 budget. I love street food, temples, and photography. I prefer a balanced pace."
                        className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition resize-none"
                      />
                      <button
                        type="submit"
                        disabled={generating}
                        className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg ${
                          generating
                            ? 'bg-indigo-500/50 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 shadow-indigo-500/25'
                        }`}
                      >
                        {generating ? (
                          <span className="flex items-center gap-2 justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            AI is planning...
                          </span>
                        ) : 'Generate Trip'}
                      </button>
                    </form>
                    {/* Quick prompts */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <p className="text-slate-600 text-xs w-full mb-1">Quick start:</p>
                      {[
                        '3-day trip to Da Lat with coffee & nature',
                        '5-day Tokyo trip for a couple, $1500 budget',
                        'Weekend in Hoi An, relaxed pace',
                      ].map(prompt => (
                        <button
                          key={prompt}
                          onClick={() => setNewTripMsg(`Plan a ${prompt}`)}
                          className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/40 transition"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Guided Trip Planner</h2>
                    <p className="text-slate-400 text-sm mb-5">
                      Not sure what to write? Fill in the details and we'll craft the perfect AI prompt for you.
                    </p>
                    <GuidedPlanner
                      key={guidedKey}
                      onGenerate={handleGuidedGenerate}
                      generating={generating}
                      prefillDestination={guidedDestination}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Popular Destinations ──────────────────────────────────────── */}
            <PopularDestinations onSelect={handleDestinationSelect} />

            {/* ── Travel Styles ─────────────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">Travel Styles</h2>
                {selectedStyles.length > 0 && (
                  <button onClick={() => setSelectedStyles([])} className="text-slate-500 hover:text-slate-300 text-xs transition">
                    Clear ({selectedStyles.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {TRAVEL_STYLES.map(({ label }) => (
                  <button
                    key={label}
                    onClick={() => toggleStyle(label)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      selectedStyles.includes(label)
                        ? 'border-indigo-500/50 bg-indigo-500/15 text-white shadow-lg shadow-indigo-950/20'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* ── My Trips + Activity Feed ──────────────────────────────────── */}
            <div className="flex gap-6 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-white">
                    My Trips
                    {trips.length > 0 && <span className="ml-2 text-sm font-normal text-slate-500">({trips.length})</span>}
                  </h2>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-60 rounded-2xl bg-white/5 animate-pulse" />)}
                  </div>
                ) : trips.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 border border-white/8 rounded-2xl bg-white/2">
                    <Map className="mx-auto mb-4 h-10 w-10 text-slate-600" />
                    <p className="font-medium text-slate-400">No trips yet</p>
                    <p className="text-sm mt-1">Start planning above or explore destinations below!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {trips.map(trip => (
                      <TripCard key={trip.id} trip={trip} onDelete={handleDeleteRequest} />
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Feed */}
              {trips.length > 0 && (
                <div className="hidden xl:block w-72 flex-shrink-0">
                  <h2 className="text-xl font-bold text-white mb-5">Recent Activity</h2>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <ActivityFeed trips={trips} />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>



      <DeleteConfirmModal 
        isOpen={deletingTripId !== null}
        onOpenChange={(open) => !open && setDeletingTripId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
