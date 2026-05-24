'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTrips, deleteTrip, generateTrip } from '@/lib/api';
import type { Trip } from '@/types';

const statusColors: Record<string, string> = {
  PLANNED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  COMPLETED: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export default function DashboardPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTripMsg, setNewTripMsg] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    loadTrips();
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

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTripMsg.trim()) return;
    setGenerating(true);
    try {
      const result = await generateTrip(newTripMsg) as { trip?: { id?: number } };
      setNewTripMsg('');
      await loadTrips();
      if (result?.trip?.id) router.push(`/trips/${result.trip.id}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this trip?')) return;
    await deleteTrip(id);
    setTrips(trips.filter((t) => t.id !== id));
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✈️</span>
          <span className="text-xl font-bold text-white">TravelAI</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-white text-sm transition"
        >
          Sign out →
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero prompt */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Plan your next adventure ✨</h1>
          <p className="text-slate-400 mb-6">Describe your dream trip and let AI do the planning</p>

          <form onSubmit={handleGenerate} className="flex gap-3">
            <input
              type="text"
              value={newTripMsg}
              onChange={(e) => setNewTripMsg(e.target.value)}
              placeholder="e.g. Plan a 5-day trip to Tokyo with a $1000 budget"
              className="flex-1 px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
            />
            <button
              type="submit"
              disabled={generating}
              className="px-6 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 transition-all duration-200 whitespace-nowrap"
            >
              {generating ? '✨ Planning...' : '🚀 Plan Trip'}
            </button>
          </form>
        </div>

        {/* Trips grid */}
        <h2 className="text-xl font-semibold text-white mb-4">My Trips</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <span className="text-5xl block mb-4">🗺️</span>
            <p>No trips yet. Start planning above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-200 cursor-pointer"
                onClick={() => router.push(`/trips/${trip.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-white font-semibold text-lg leading-tight">{trip.title}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-lg transition"
                  >
                    ×
                  </button>
                </div>
                <p className="text-indigo-300 font-medium">📍 {trip.destination}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {trip.start_date} → {trip.end_date}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[trip.status]}`}>
                    {trip.status}
                  </span>
                  <span className="text-slate-400 text-sm">
                    {trip.currency} {trip.total_budget.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
