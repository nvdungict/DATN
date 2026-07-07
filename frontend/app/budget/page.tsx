'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { getTrips, getTripItinerary } from '@/lib/api';
import { formatCurrency, normalizeToVND, extractItemCostInVND } from '@/lib/currency';

export default function BudgetPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const tripsData = await getTrips();
        const tripsArray = Array.isArray(tripsData) ? tripsData : [];
        setTrips(tripsArray);

        // Fetch itineraries for all trips
        const allItems = [];
        for (const trip of tripsArray) {
          try {
            const itData = await getTripItinerary(trip.id);
            if (Array.isArray(itData)) {
              allItems.push(...itData.map(item => ({ ...item, trip })));
            }
          } catch (err) {
            console.error(`Failed to load itinerary for trip ${trip.id}`);
          }
        }
        // Sort by created_at descending to show recent transactions
        allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setItineraries(allItems);
      } catch (err) {
        console.error('Failed to load budget data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtering
  const filteredTrips = selectedTripId === 'all' ? trips : trips.filter(t => t.id.toString() === selectedTripId);
  const filteredItineraries = selectedTripId === 'all' ? itineraries : itineraries.filter(i => i.trip_id.toString() === selectedTripId);

  // Aggregations
  const totalBudget = filteredTrips.reduce((sum, trip) => {
    return sum + normalizeToVND(trip.total_budget, trip.currency);
  }, 0);
  
  let totalSpent = 0;
  const categorySpent: Record<string, number> = {
    LODGING: 0,
    TRANSPORT: 0,
    MEAL: 0,
    ATTRACTION: 0,
    OTHER: 0
  };

  filteredItineraries.forEach(item => {
    const details = item.activity_details || {};
    const cost = extractItemCostInVND(details, item.trip?.currency);

    totalSpent += cost;
    const type = item.type || 'OTHER';
    if (categorySpent[type] !== undefined) {
      categorySpent[type] += cost;
    } else {
      categorySpent['OTHER'] += cost;
    }
  });

  const remaining = totalBudget - totalSpent;
  // Estimate daily spend: assume an average trip is 4 days if we don't calculate exactly, or calculate based on items.
  const totalDays = filteredTrips.reduce((sum, trip) => {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return sum + diffDays;
  }, 0) || 1;
  const averageDailySpend = totalSpent / totalDays;

  // Colors for categories
  const categoryColors: Record<string, string> = {
    LODGING: 'bg-indigo-500',
    TRANSPORT: 'bg-emerald-500',
    MEAL: 'bg-amber-500',
    ATTRACTION: 'bg-rose-500',
    OTHER: 'bg-slate-500'
  };

  const categoryLabels: Record<string, string> = {
    LODGING: 'Accommodation',
    TRANSPORT: 'Transportation',
    MEAL: 'Food & Dining',
    ATTRACTION: 'Activities & Attractions',
    OTHER: 'Other Expenses'
  };

  // Listen for currency change
  const [_, setForceRender] = useState(0);
  useEffect(() => {
    const handler = () => setForceRender(r => r + 1);
    window.addEventListener('currencyChange', handler);
    return () => window.removeEventListener('currencyChange', handler);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 flex text-white">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Wallet className="w-8 h-8 text-emerald-400" /> Budget Tracker
              </h1>
              <p className="text-slate-400 mt-2">Manage your expenses and track spending across your trips.</p>
            </div>
            
            {!loading && trips.length > 0 && (
              <div className="relative">
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="appearance-none bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl pl-4 pr-10 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer shadow-lg shadow-black/20"
                >
                  <option value="all" className="bg-slate-900 text-white">All Trips</option>
                  {trips.map(trip => (
                    <option key={trip.id} value={trip.id.toString()} className="bg-slate-900 text-white">
                      {trip.destination}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="animate-pulse space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl"></div>)}
              </div>
              <div className="h-64 bg-white/5 rounded-3xl"></div>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
              <p className="text-slate-400 mb-4">You don't have any active trips.</p>
              <Link href="/dashboard" className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition">
                Create a Trip to track Budget
              </Link>
            </div>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-4 text-slate-400">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400"><DollarSign className="w-4 h-4" /></div>
                    <span className="font-medium text-sm">Total Budget</span>
                  </div>
                  <div className="text-2xl font-bold truncate">{formatCurrency(totalBudget, 'VND')}</div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-4 text-slate-400">
                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400"><ArrowUpRight className="w-4 h-4" /></div>
                    <span className="font-medium text-sm">Total Spent</span>
                  </div>
                  <div className="text-2xl font-bold truncate">{formatCurrency(totalSpent, 'VND')}</div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-4 text-slate-400">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><ArrowDownRight className="w-4 h-4" /></div>
                    <span className="font-medium text-sm">Remaining</span>
                  </div>
                  <div className={`text-2xl font-bold truncate ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatCurrency(remaining, 'VND')}
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-4 text-slate-400">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400"><TrendingUp className="w-4 h-4" /></div>
                    <span className="font-medium text-sm">Avg. Daily Spend</span>
                  </div>
                  <div className="text-2xl font-bold truncate">{formatCurrency(averageDailySpend, 'VND')}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Spending by Category */}
                <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-400" /> Category Breakdown
                  </h2>
                  
                  <div className="space-y-6 flex-1">
                    {Object.entries(categorySpent).filter(([_, amount]) => amount > 0).sort((a, b) => b[1] - a[1]).map(([type, amount]) => {
                      const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-sm font-medium mb-2">
                            <span className="text-slate-300 flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${categoryColors[type] || categoryColors.OTHER}`}></span>
                              {categoryLabels[type] || type}
                            </span>
                            <div className="flex gap-4">
                              <span className="text-slate-400">{percentage.toFixed(1)}%</span>
                              <span className="text-white">{formatCurrency(amount, 'VND')}</span>
                            </div>
                          </div>
                          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${categoryColors[type] || categoryColors.OTHER} rounded-full transition-all duration-1000`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {totalSpent === 0 && (
                      <div className="text-center py-10 text-slate-500">
                        No spending data available yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed Expense List */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col">
                  <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
                    <span>{selectedTripId === 'all' ? 'Recent Expenses' : 'Detailed Expenses'}</span>
                    {selectedTripId !== 'all' && <span className="text-xs font-normal text-slate-400 bg-white/10 px-2 py-1 rounded">Filtered</span>}
                  </h2>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[500px] custom-scrollbar">
                    {filteredItineraries.filter(item => extractItemCostInVND(item.activity_details, item.trip?.currency) > 0).sort((a,b) => {
                       // Group by type if a specific trip is selected, otherwise sort by date descending
                       if (selectedTripId !== 'all') {
                         return a.type.localeCompare(b.type);
                       }
                       return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }).map((item, index, arr) => {
                      const details = item.activity_details || {};
                      const costVND = extractItemCostInVND(details, item.trip?.currency);
                      
                      const showCategoryHeader = selectedTripId !== 'all' && (index === 0 || item.type !== arr[index-1].type);

                      return (
                        <div key={item.id} className="space-y-3">
                          {showCategoryHeader && (
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 first:mt-0 pb-1 border-b border-white/10">
                              {categoryLabels[item.type] || item.type}
                            </div>
                          )}
                          <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition border border-transparent hover:border-white/5 group">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${categoryColors[item.type] ? categoryColors[item.type].replace('bg-', 'bg-').concat('/20') : 'bg-slate-500/20'}`}>
                              <span className="text-lg">
                                {item.type === 'MEAL' ? '🍽️' : item.type === 'TRANSPORT' ? '🚗' : item.type === 'LODGING' ? '🏨' : '🎟️'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{details.name || details.title || 'Unknown Expense'}</p>
                              {selectedTripId === 'all' && (
                                <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" /> {item.trip.destination}
                                </p>
                              )}
                            </div>
                            <div className="font-semibold text-white text-sm whitespace-nowrap">
                              {formatCurrency(costVND, 'VND')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {totalSpent === 0 && (
                      <div className="text-center py-6 text-slate-500 text-sm">
                        No expenses logged for {selectedTripId === 'all' ? 'any trips' : 'this trip'}.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
