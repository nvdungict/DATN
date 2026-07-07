import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../lib/currency';

interface AlternativesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: number;
  itineraryItemId: number;
  onSelect: (newDetails: any) => void;
}

export default function AlternativesModal({
  isOpen,
  onClose,
  tripId,
  itineraryItemId,
  onSelect
}: AlternativesModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ type: string; options: any[] } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchAlternatives = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        const res = await fetch(`${apiUrl}/trips/${tripId}/items/${itineraryItemId}/alternatives`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch alternatives');
        }
        
        const json = await res.json();
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'An error occurred while fetching alternatives.');
          setLoading(false);
        }
      }
    };

    fetchAlternatives();
    
    return () => { isMounted = false; };
  }, [isOpen, tripId, itineraryItemId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">
            Alternative Options
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-indigo-400">
              <svg className="animate-spin h-10 w-10 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-300 font-medium animate-pulse">Searching global distribution systems...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-center py-8">
              <p>{error}</p>
              <button 
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          ) : data?.options?.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No alternative options found for these dates.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.options.map((opt: any, index: number) => (
                <div key={opt.id || index} className="p-5 bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-xl transition-all flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group">
                  <div className="flex-1 flex flex-col sm:flex-row gap-4 w-full">
                    {data.type === 'HOTEL' && opt.image_url && (
                      <div className="w-full sm:w-32 h-40 sm:h-32 rounded-lg overflow-hidden shrink-0 shadow-lg">
                        <img src={opt.image_url} alt={opt.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-center">
                      {data.type === 'FLIGHT' ? (
                        <div>
                          <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            <span className="text-indigo-400">✈️ {opt.airline}</span>
                            <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">{opt.flight_number}</span>
                          </h3>
                          <p className="text-slate-300 mt-2 flex items-center gap-3">
                            <span className="font-semibold">{opt.departure_time}</span>
                            <span className="text-slate-500 text-sm">({opt.departure_airport})</span>
                            <span className="text-slate-600">→</span>
                            <span className="font-semibold">{opt.arrival_time}</span>
                            <span className="text-slate-500 text-sm">({opt.arrival_airport})</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-2">Duration: {opt.duration} • {opt.cabin_class}</p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="font-bold text-white text-lg flex flex-wrap items-center gap-2">
                            <span className="text-emerald-400">{opt.name}</span>
                            <span className="text-amber-400 text-sm tracking-widest">{'★'.repeat(opt.stars || 4)}</span>
                            {opt.rating && (
                              <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded-md">
                                {opt.rating}/10
                              </span>
                            )}
                          </h3>
                          <p className="text-slate-400 mt-1 text-sm flex items-center gap-1">
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {opt.address}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {opt.amenities?.slice(0, 4).map((amenity: string, i: number) => (
                              <span key={i} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-white/10 text-slate-300 rounded-md whitespace-nowrap">
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 sm:gap-2">
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(data.type === 'FLIGHT' ? opt.price : (opt.total_price || opt.price_per_night), opt.currency)}
                      </p>
                      {data.type === 'HOTEL' && <p className="text-xs text-slate-400">Total stay</p>}
                    </div>
                    <button 
                      onClick={() => onSelect(opt)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all active:scale-95 whitespace-nowrap shadow-lg shadow-indigo-500/20"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
