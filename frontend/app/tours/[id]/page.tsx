'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PREMADE_TOURS, PremadeTour } from '@/data/premadeTours';
import { clonePremadeTour } from '@/lib/api';
import { 
  ArrowLeft, MapPin, Clock, DollarSign, 
  CheckCircle2, Sparkles, Wand2, Download, Calendar as CalendarIcon 
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function TourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [tour, setTour] = useState<PremadeTour | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const resolvedParams = use(params);

  useEffect(() => {
    const found = PREMADE_TOURS.find(t => t.id === resolvedParams.id);
    if (found) setTour(found);
  }, [resolvedParams.id]);

  if (!tour) return null; // or a loading/404 state

  async function handleSaveTrip() {
    if (!tour) return;
    setIsCloning(true);
    try {
      const newTrip = await clonePremadeTour(tour);
      // Redirect to the newly created trip dashboard
      router.push(`/trips/${newTrip.id}`);
    } catch (err) {
      console.error("Failed to clone tour", err);
      setIsCloning(false);
      alert("Failed to save trip. Please try again.");
    }
  }

  async function handleCustomize() {
    if (!tour) return;
    setIsCloning(true);
    try {
      const newTrip = await clonePremadeTour(tour);
      const prompt = `I want to customize this tour. Here is what I want to modify: `;
      router.push(`/trips/${newTrip.id}?auto_prompt=${encodeURIComponent(prompt)}`);
    } catch (err) {
      console.error("Failed to clone tour for customization", err);
      setIsCloning(false);
      alert("Failed to start customization. Please try again.");
    }
  }

  // Group itinerary by day
  const daysMap = tour.itinerary.reduce((acc, item) => {
    if (!acc[item.day_number]) acc[item.day_number] = [];
    acc[item.day_number].push(item);
    return acc;
  }, {} as Record<number, typeof tour.itinerary>);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        
        {/* --- Hero Section --- */}
        <div className="relative h-[60vh] min-h-[500px] w-full">
          <img 
            src={tour.cover_image} 
            alt={tour.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />
          
          <div className="absolute top-8 left-8">
            <Link href="/tours" className="flex items-center gap-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md px-4 py-2 rounded-full transition">
              <ArrowLeft className="w-4 h-4" /> Back to Tours
            </Link>
          </div>

          <div className="absolute bottom-0 w-full px-8 pb-12 max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-md">
              {tour.category}
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 drop-shadow-lg leading-tight">
              {tour.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-slate-200 font-medium">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <MapPin className="w-5 h-5 text-rose-400" /> {tour.destination}
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <Clock className="w-5 h-5 text-amber-400" /> {tour.duration_days} Days
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <DollarSign className="w-5 h-5 text-emerald-400" /> {tour.budget_level}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
          
          {/* --- Main Content (Left) --- */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Overview */}
            <section>
              <h2 className="text-3xl font-bold text-white mb-6">Overview</h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                {tour.overview}
              </p>
            </section>

            {/* Highlights */}
            <section>
              <h2 className="text-3xl font-bold text-white mb-6">Tour Highlights</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tour.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-2xl p-4">
                    <CheckCircle2 className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                    <span className="text-slate-200 font-medium">{highlight}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Itinerary Timeline */}
            <section>
              <h2 className="text-3xl font-bold text-white mb-8">Detailed Itinerary</h2>
              <div className="space-y-12">
                {Object.keys(daysMap).map(dayNum => {
                  const items = daysMap[parseInt(dayNum)];
                  return (
                    <div key={dayNum} className="relative">
                      {/* Day Header */}
                      <div className="sticky top-4 z-10 inline-flex items-center gap-3 bg-slate-900 border border-white/10 px-5 py-2.5 rounded-full shadow-xl mb-6">
                        <CalendarIcon className="w-5 h-5 text-indigo-400" />
                        <span className="font-bold text-white text-lg">Day {dayNum}</span>
                      </div>

                      {/* Activities */}
                      <div className="ml-6 border-l-2 border-indigo-500/20 pl-8 space-y-8 relative">
                        {items.map((item, idx) => (
                          <div key={idx} className="relative group">
                            {/* Timeline dot */}
                            <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-slate-900 border-4 border-indigo-500 group-hover:border-indigo-400 transition-colors" />
                            
                            <div className="bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all rounded-2xl p-6">
                              <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                                <h4 className="text-xl font-bold text-white">{item.activity}</h4>
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-black/40 text-indigo-300 text-sm font-mono font-medium">
                                  {item.start_time.slice(0,5)}
                                </div>
                              </div>
                              <p className="text-slate-400 flex items-center gap-2 mb-4">
                                <MapPin className="w-4 h-4" /> {item.location}
                              </p>
                              {item.notes && (
                                <p className="text-sm text-slate-300 bg-black/20 p-3 rounded-xl border border-white/5">
                                  💡 {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* --- Sticky Action Bar (Right) --- */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">Ready to go?</h3>
              <p className="text-sm text-slate-400 mb-8">
                Add this exact itinerary to your account instantly, or use it as a starting point for AI customization.
              </p>

              <div className="space-y-4">
                <button 
                  onClick={handleSaveTrip}
                  disabled={isCloning}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isCloning ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Download className="w-5 h-5" /> 
                      Save This Trip
                    </>
                  )}
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-semibold uppercase">Or</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <button 
                  onClick={handleCustomize}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-[0.98]"
                >
                  <Wand2 className="w-5 h-5 text-indigo-400" />
                  Customize with AI
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 text-sm text-slate-400 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Free instant clone
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Modify dates later
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
