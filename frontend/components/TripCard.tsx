'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Trip } from '@/types';
import { formatCurrency } from '@/lib/currency';

const statusColors: Record<string, string> = {
  PLANNED: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  COMPLETED: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

const statusProgress: Record<string, number> = {
  PLANNED: 25,
  ACTIVE: 65,
  COMPLETED: 100,
};

// Destination → Local image mapping
const destinationImages: Record<string, string> = {
  'da lat': '/destinations/dalat.jpg',
  'đà lạt': '/destinations/dalat.jpg',
  'da nang': '/destinations/danang.jpg',
  'đà nẵng': '/destinations/danang.jpg',
  'hoi an': '/destinations/hoian.jpg',
  'hội an': '/destinations/hoian.jpg',
  'nha trang': '/destinations/nhatrang.jpg',
  'phu quoc': '/destinations/phuquoc.jpg',
  'phú quốc': '/destinations/phuquoc.jpg',
  'tokyo': '/destinations/tokyo.jpg',
  'singapore': '/destinations/singapore.jpg',
  'ha noi': '/destinations/hanoi.jpg',
  'hà nội': '/destinations/hanoi.jpg',
  'ho chi minh': '/destinations/hochiminh2.jpg',
  'hồ chí minh': '/destinations/hochiminh2.jpg',
  'bali': '/destinations/bali.jpg',
  'paris': '/destinations/paris.jpg',
  'bangkok': '/destinations/bangkok.jpg',
};

const DEFAULT_IMAGES = [
  '/defaults/1.jpg',
  '/defaults/2.jpg',
  '/defaults/3.jpg',
  '/defaults/4.jpg',
  '/defaults/5.jpg',
  '/defaults/6.jpg',
];

export function getDestinationImage(destination: string): string {
  const key = destination?.toLowerCase().trim() || '';
  for (const [k, v] of Object.entries(destinationImages)) {
    if (key.includes(k)) return v;
  }
  const sum = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DEFAULT_IMAGES[sum % DEFAULT_IMAGES.length];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function TripCard({
  trip,
  onDelete,
}: {
  trip: Trip;
  onDelete: (id: number) => void;
}) {
  const router = useRouter();
  const imgSrc = getDestinationImage(trip.destination);
  const progress = statusProgress[trip.status] ?? 25;

  // Listen for currency change
  const [_, setForceRender] = useState(0);
  useEffect(() => {
    const handler = () => setForceRender(r => r + 1);
    window.addEventListener('currencyChange', handler);
    return () => window.removeEventListener('currencyChange', handler);
  }, []);

  return (
    <div
      onClick={() => router.push(`/trips/${trip.id}`)}
      className="group relative overflow-hidden rounded-2xl border border-white/10 cursor-pointer hover:border-indigo-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10"
    >
      {/* Background Image */}
      <div className="relative h-40 overflow-hidden">
        <Image
          src={imgSrc}
          alt={trip.destination}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border backdrop-blur-sm ${statusColors[trip.status]}`}>
            {trip.status}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }}
            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-black/60 border border-white/20 text-slate-400 hover:text-red-400 hover:bg-red-500/20 flex items-center justify-center text-sm transition-all"
          >
            ×
          </button>
        </div>

        {/* Destination label */}
        <div className="absolute bottom-3 left-4">
          <p className="text-indigo-300 text-xs font-medium tracking-wide">📍 {trip.destination}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-slate-900/90">
        <h3 className="text-white font-semibold text-base leading-tight mb-1 group-hover:text-indigo-200 transition-colors">
          {trip.title}
        </h3>
        <p className="text-slate-400 text-sm">
          {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
        </p>

        {/* Progress & Budget */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-500 text-xs">{progress}% Ready</span>
            <span className="text-slate-300 text-xs font-medium">
              {formatCurrency(trip.total_budget, trip.currency)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
