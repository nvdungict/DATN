'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTrip, getTripItinerary } from '@/lib/api';
import type { Trip, ItineraryItem } from '@/types';
import dynamic from 'next/dynamic';
import ChatInterface from '@/components/ChatInterface';

const Dashboard = dynamic(() => import('@/components/Dashboard'), { ssr: false });
const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), { ssr: false });

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = Number(params.id);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'map'>('timeline');
  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    loadData();
  }, [tripId]);

  async function loadData() {
    try {
      const [tripData, itemsData] = await Promise.all([
        getTrip(tripId) as Promise<Trip>,
        getTripItinerary(tripId) as Promise<ItineraryItem[]>,
      ]);
      setTrip(tripData);
      setItems(itemsData);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Loading trip... ✈️</div>
      </div>
    );
  }

  if (!trip) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <Link href="/dashboard" className="text-slate-400 hover:text-white transition">
          ← Dashboard
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">{trip.title}</h1>
          <p className="text-slate-400 text-sm">
            📍 {trip.destination} · {trip.start_date} → {trip.end_date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">
            {trip.currency} {trip.total_budget.toLocaleString()}
          </span>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="ml-4 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-600/30 transition"
          >
            💬 Chat
          </button>
        </div>
      </nav>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${chatOpen ? 'mr-0' : ''}`}>
          {/* Tab bar */}
          <div className="flex gap-1 px-6 pt-4 pb-0">
            {(['timeline', 'map'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition capitalize ${
                  activeTab === tab
                    ? 'bg-white/10 text-white border border-white/10 border-b-0'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'timeline' ? '📅 Timeline' : '🗺️ Map'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-6 pt-4">
            {activeTab === 'timeline' ? (
              <Dashboard
                tripId={tripId}
                items={items}
                onItemsChange={setItems}
              />
            ) : (
              <InteractiveMap items={items} />
            )}
          </div>
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div className="w-96 flex-shrink-0 border-l border-white/10 flex flex-col">
            <ChatInterface
              tripId={tripId}
              onTripUpdate={loadData}
            />
          </div>
        )}
      </div>
    </div>
  );
}
