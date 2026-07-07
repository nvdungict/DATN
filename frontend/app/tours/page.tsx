'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PREMADE_TOURS } from '@/data/premadeTours';
import Sidebar from '@/components/Sidebar';
import { Map, Clock, DollarSign, ArrowRight } from 'lucide-react';

export default function ToursPage() {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  
  const categories = ['All', 'City', 'Nature', 'Culture', 'Beach'];
  
  const filteredTours = filterCategory === 'All' 
    ? PREMADE_TOURS 
    : PREMADE_TOURS.filter(t => t.category === filterCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 flex">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">

          {/* Header */}
          <div className="text-center space-y-4 mb-12">
            <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 drop-shadow-xl">
              Curated Escapes
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Skip the planning phase. Browse our meticulously crafted itineraries designed by travel experts and add them to your collection instantly.
            </p>
            
            {/* Filters */}
            <div className="flex flex-wrap justify-center gap-3 pt-6">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    filterCategory === cat 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tour Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTours.map(tour => (
              <div key={tour.id} className="group flex flex-col bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-3xl overflow-hidden hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500">
                {/* Image */}
                <div className="relative aspect-video overflow-hidden">
                  <Image 
                    src={tour.cover_image} 
                    alt={tour.title} 
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-bold text-white shadow-lg">
                    {tour.category}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-heading text-2xl font-bold text-white leading-tight drop-shadow-md">{tour.title}</h3>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 flex flex-col">
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-4">
                    <div className="flex items-center gap-1"><Map className="w-4 h-4" /> {tour.destination.split(',')[0]}</div>
                    <div className="flex items-center gap-1"><Clock className="w-4 h-4" /> {tour.duration_days} Days</div>
                    <div className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> {tour.budget_level}</div>
                  </div>
                  
                  <p className="text-sm text-slate-400 line-clamp-3 mb-6 flex-1">
                    {tour.overview}
                  </p>

                  <Link 
                    href={`/tours/${tour.id}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 hover:bg-indigo-600 border border-white/5 text-white font-semibold transition-all group-hover:border-indigo-500/50"
                  >
                    View Trip <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filteredTours.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <p>No tours found for this category.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
