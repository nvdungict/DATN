'use client';
import { DollarSign, PieChart, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency, normalizeToVND, extractItemCostInVND } from '@/lib/currency';
import type { Trip, ItineraryItem } from '@/types';

export default function TripBudget({ trip, items }: { trip: Trip; items: ItineraryItem[] }) {
  const totalBudget = normalizeToVND(trip.total_budget, trip.currency);
  
  let totalSpent = 0;
  const categorySpent: Record<string, number> = {
    LODGING: 0,
    TRANSPORT: 0,
    MEAL: 0,
    ATTRACTION: 0,
    OTHER: 0
  };

  items.forEach(item => {
    const details = item.activity_details || {} as any;
    const cost = extractItemCostInVND(details, trip.currency);

    totalSpent += cost;
    const type = item.type || 'OTHER';
    if (categorySpent[type] !== undefined) {
      categorySpent[type] += cost;
    } else {
      categorySpent['OTHER'] += cost;
    }
  });

  const remaining = totalBudget - totalSpent;

  // Estimate days
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const averageDailySpend = totalSpent / (diffDays || 1);

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
    ATTRACTION: 'Activities',
    OTHER: 'Other / Contingency'
  };

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all"></div>
          <div className="flex items-center gap-3 mb-4 text-slate-400">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400"><DollarSign className="w-4 h-4" /></div>
            <span className="font-medium text-sm">Total Budget</span>
          </div>
          <div className="text-2xl lg:text-[22px] xl:text-2xl font-bold break-words">{formatCurrency(totalBudget, 'VND')}</div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/20 transition-all"></div>
          <div className="flex items-center gap-3 mb-4 text-slate-400">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400"><ArrowUpRight className="w-4 h-4" /></div>
            <span className="font-medium text-sm">Total Spent</span>
          </div>
          <div className="text-2xl lg:text-[22px] xl:text-2xl font-bold break-words">{formatCurrency(totalSpent, 'VND')}</div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center gap-3 mb-4 text-slate-400">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><ArrowDownRight className="w-4 h-4" /></div>
            <span className="font-medium text-sm">Remaining</span>
          </div>
          <div className={`text-2xl lg:text-[22px] xl:text-2xl font-bold break-words ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formatCurrency(remaining, 'VND')}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/20 transition-all"></div>
          <div className="flex items-center gap-3 mb-4 text-slate-400">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400"><TrendingUp className="w-4 h-4" /></div>
            <span className="font-medium text-sm">Avg. Daily Spend</span>
          </div>
          <div className="text-2xl lg:text-[22px] xl:text-2xl font-bold break-words">{formatCurrency(averageDailySpend, 'VND')}</div>
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
            <span>Detailed Expenses</span>
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[500px] custom-scrollbar">
            {items.filter(item => extractItemCostInVND(item.activity_details as any, trip.currency) > 0).sort((a,b) => {
               return a.type.localeCompare(b.type);
            }).map((item, index, arr) => {
              const details = item.activity_details || {} as any;
              const costVND = extractItemCostInVND(details, trip.currency);
              
              const showCategoryHeader = (index === 0 || item.type !== arr[index-1].type);

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
                        {item.type === 'MEAL' ? '🍽️' : item.type === 'TRANSPORT' ? '🚗' : item.type === 'LODGING' ? '🏨' : item.type === 'OTHER' ? '💼' : '🎟️'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-semibold text-white line-clamp-3">{details.name || 'Unknown Expense'}</p>
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
                No expenses logged for this trip.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
