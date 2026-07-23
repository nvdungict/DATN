'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getTrip, getTripItinerary, getTripWeather } from '@/lib/api';
import type { Trip, ItineraryItem, TripWeather } from '@/types';
import dynamic from 'next/dynamic';
import ChatInterface from '@/components/ChatInterface';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import ShareModal from '@/components/ShareModal';
import { formatCurrency } from '@/lib/currency';
import { CircleDollarSign, CloudSun, Map, Route, Trash2, Users } from 'lucide-react';

const Dashboard = dynamic(() => import('@/components/Dashboard'), { ssr: false });
const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), { ssr: false });
const TripBudget = dynamic(() => import('@/components/TripBudget'), { ssr: false });
const WeatherInsight = dynamic(() => import('@/components/WeatherInsight'), { ssr: false });

const statusColors: Record<string, string> = {
  PLANNED:   'text-blue-400 bg-blue-500/10 border-blue-500/25',
  ACTIVE:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  COMPLETED: 'text-slate-400 bg-slate-500/10 border-slate-500/25',
};

function formatDate(d: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
}

function isReviewableItem(item: ItineraryItem) {
  const name = item.activity_details?.name?.toLowerCase() || '';
  return (
    item.type !== 'OTHER' &&
    !name.includes('local transport') &&
    !name.includes('chi phí đi lại')
  );
}

export default function TripDetailPage() {
  const params  = useParams();
  const searchParams = useSearchParams();
  const router  = useRouter();
  const tripId  = Number(params.id);
  const autoPrompt = searchParams.get('auto_prompt') || undefined;

  const [trip, setTrip]           = useState<Trip | null>(null);
  const [items, setItems]         = useState<ItineraryItem[]>([]);
  const [weather, setWeather]     = useState<TripWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'map' | 'weather' | 'budget'>('timeline');
  const [chatOpen, setChatOpen]   = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    loadData();
    
    // Check payment status
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      alert('Payment successful! Your trip is now ACTIVE.');
      // Remove query param
      router.replace(`/trips/${tripId}`);
    } else if (paymentStatus === 'failed') {
      alert('Payment failed. Please try again.');
      router.replace(`/trips/${tripId}`);
    } else if (paymentStatus === 'failed_signature') {
      alert('Payment security verification failed. Please contact support.');
      router.replace(`/trips/${tripId}`);
    }
    
    // Sync WebSocket
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/ai/sync/${tripId}?token=${token}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'REFRESH_ITINERARY') {
          loadData();
        }
      } catch (e) {}
    };
    
    return () => ws.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function loadData() {
    try {
      setWeatherLoading(true);
      const [tripData, itemsData] = await Promise.all([
        getTrip(tripId) as Promise<Trip>,
        getTripItinerary(tripId) as Promise<ItineraryItem[]>,
      ]);
      setTrip(tripData);
      setItems(itemsData);
      getTripWeather(tripId)
        .then((data) => setWeather(data as TripWeather))
        .catch(() => setWeather(null))
        .finally(() => setWeatherLoading(false));
    } catch {
      setWeatherLoading(false);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmDelete() {
    const { deleteTrip } = await import('@/lib/api');
    await deleteTrip(tripId);
    router.push('/dashboard');
  }

  // Listen for currency change
  const [_, setForceRender] = useState(0);
  useEffect(() => {
    const handler = () => setForceRender(r => r + 1);
    window.addEventListener('currencyChange', handler);
    return () => window.removeEventListener('currencyChange', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading itinerary...</div>
      </div>
    );
  }

  if (!trip) return null;

  const reviewableItems = items.filter(isReviewableItem);
  const confirmedItems = reviewableItems.filter(i => i.status !== 'SUGGESTED').length;
  const totalItems = reviewableItems.length;
  const progressPct = totalItems > 0 ? Math.round((confirmedItems / totalItems) * 100) : 0;

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
        {/* Main nav row */}
        <div className="flex items-center gap-4 px-6 py-3.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-slate-500 hover:text-white transition text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </Link>

          <span className="text-slate-700">/</span>

          {/* Trip title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-semibold text-base truncate leading-tight">{trip.title}</h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Status */}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[trip.status] ?? statusColors.PLANNED}`}>
              {trip.status}
            </span>

            {/* Budget */}
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap hidden sm:block">
              {formatCurrency(trip.total_budget, trip.currency)}
            </div>

            {/* Role Badge */}
            {trip.user_role && trip.user_role !== 'OWNER' && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {trip.user_role}
              </span>
            )}

            {/* Chat toggle (hidden for VIEWERS) */}
            {trip.user_role !== 'VIEWER' && (
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg ${
                  chatOpen
                    ? 'bg-indigo-600 border border-indigo-500 text-white shadow-indigo-500/25'
                    : 'bg-white/10 border border-white/20 text-slate-200 hover:text-white hover:bg-white/15 hover:shadow-white/10'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 2.5C2 1.67 2.67 1 3.5 1H10.5C11.33 1 12 1.67 12 2.5V8.5C12 9.33 11.33 10 10.5 10H8L5 13V10H3.5C2.67 10 2 9.33 2 8.5V2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
                {chatOpen ? 'Close AI Copilot' : 'AI Assistant'}
              </button>
            )}

            {/* Invite button */}
            {trip.user_role === 'OWNER' && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-all"
              >
                <Users className="w-4 h-4" />
                Invite
              </button>
            )}

            {/* Delete button */}
            {trip.user_role === 'OWNER' && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                title="Delete Trip"
                className="flex items-center justify-center w-[34px] h-[34px] rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5 px-6 pb-3 text-[13px] text-slate-400 font-medium">
          <span className="text-slate-300">{trip.destination}</span>
          <span className="text-slate-600">·</span>
          <span>{formatDate(trip.start_date)} – {formatDate(trip.end_date)}</span>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 px-6 border-t border-white/10 overflow-x-auto">
          {(['timeline', 'map', 'weather', 'budget'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize -mb-px whitespace-nowrap ${
                activeTab === tab
                  ? 'border-indigo-400 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {tab === 'timeline' ? <Route className="w-4 h-4" /> : tab === 'map' ? <Map className="w-4 h-4" /> : tab === 'weather' ? <CloudSun className="w-4 h-4" /> : <CircleDollarSign className="w-4 h-4" />}
                {tab === 'timeline' ? 'Timeline' : tab === 'map' ? 'Map' : tab === 'weather' ? 'Weather' : 'Budget'}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main content */}
        <div className="flex-1 overflow-auto bg-slate-950">
          <div className="max-w-7xl mx-auto px-6 py-8">
            
            {/* ── Summary Card ─────────────────────────────────────────────── */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-3xl p-8 mb-10 shadow-2xl">
              <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                {trip.title}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 sm:[&>div]:min-w-0">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Destination</p>
                  <p className="text-white font-medium truncate" title={trip.destination}>{trip.destination}</p>
                </div>
                <div className="sm:justify-self-center sm:text-center">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Budget</p>
                  <p className="text-emerald-400 font-medium">{formatCurrency(trip.total_budget, trip.currency)}</p>
                </div>
                <div className="sm:justify-self-end sm:text-right">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-white font-medium">{new Set(items.map(i => i.day_number)).size} Days</p>
                </div>
              </div>

              {/* Big Progress Bar */}
              <div className="bg-black/20 rounded-2xl p-5 border border-white/5">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1">Planning Progress</h3>
                    <p className="text-slate-400 text-xs">{confirmedItems} of {totalItems} activities confirmed</p>
                  </div>
                  <span className="text-2xl font-bold text-white">{progressPct}%</span>
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {activeTab === 'timeline' ? (
              <Dashboard
                tripId={tripId}
                items={items}
                tripDestination={trip.destination}
                onItemsChange={setItems}
                readOnly={trip.user_role === 'VIEWER'}
                tripStatus={trip.status}
              />
            ) : activeTab === 'map' ? (
              <InteractiveMap items={items} />
            ) : activeTab === 'weather' ? (
              <div className="max-w-5xl">
                <WeatherInsight weather={weather} loading={weatherLoading} />
              </div>
            ) : (
              <TripBudget trip={trip} items={items} />
            )}
          </div>
        </div>

        {/* Drawer Overlay for Chat */}
        {chatOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setChatOpen(false)}
          />
        )}
        
        {/* Drawer Chat Assistant */}
        <div 
          className={`fixed top-0 right-0 bottom-0 w-[420px] bg-slate-900 border-l border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
            chatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <ChatInterface
            tripId={tripId}
            onTripUpdate={loadData}
            initialPrompt={autoPrompt}
          />
        </div>
      </div>
      
      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
      />

      {isShareModalOpen && (
        <ShareModal 
          tripId={tripId} 
          onClose={() => setIsShareModalOpen(false)} 
        />
      )}
    </div>
  );
}
