'use client';

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Hotel,
  Info,
  MapPin,
  Navigation,
  Plane,
  Star,
  Tag,
  X,
} from 'lucide-react';
import type { ItineraryItem } from '@/types';
import { extractItemCostRaw, formatCurrency } from '@/lib/currency';

const typeStyles: Record<string, { label: string; className: string }> = {
  ATTRACTION: { label: 'Attraction', className: 'border-violet-500/30 bg-violet-500/15 text-violet-300' },
  MEAL: { label: 'Dining', className: 'border-amber-500/30 bg-amber-500/15 text-amber-300' },
  TRANSPORT: { label: 'Transport', className: 'border-sky-500/30 bg-sky-500/15 text-sky-300' },
  LODGING: { label: 'Lodging', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' },
  OTHER: { label: 'Other', className: 'border-slate-500/30 bg-slate-500/15 text-slate-300' },
};

const statusStyles: Record<string, { label: string; className: string }> = {
  SUGGESTED: { label: 'Suggested', className: 'border-slate-500/20 bg-slate-500/10 text-slate-400' },
  CONFIRMED: { label: 'Confirmed', className: 'border-indigo-500/25 bg-indigo-500/10 text-indigo-300' },
  COMPLETED: { label: 'Completed', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' },
};

function formatTime(item: ItineraryItem) {
  if (!item.start_time && !item.end_time) return 'No time set';
  return `${item.start_time || 'TBD'}${item.end_time ? ` - ${item.end_time}` : ''}`;
}

function hasCoordinate(item: ItineraryItem) {
  const lat = item.activity_details?.lat;
  const lng = item.activity_details?.lng;
  return lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/5 text-slate-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <div className="mt-1 text-sm font-medium leading-6 text-slate-200 break-words">{value}</div>
      </div>
    </div>
  );
}

export default function ActivityDetailPanel({
  item,
  isOpen,
  onClose,
  tripCurrency,
}: {
  item: ItineraryItem | null;
  isOpen: boolean;
  onClose: () => void;
  tripCurrency?: string;
}) {
  if (!isOpen || !item) return null;

  const details = item.activity_details || {};
  const type = typeStyles[item.type] || typeStyles.OTHER;
  const status = statusStyles[item.status] || statusStyles.SUGGESTED;
  const { cost, currency } = extractItemCostRaw(details);
  const costText = cost > 0 ? formatCurrency(cost, currency || tripCurrency) : 'No cost estimate';
  const bookingLink = details.booking_link;
  const isExternalBooking = bookingLink?.startsWith('http');

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-[80] flex h-screen w-full max-w-md flex-col border-l border-white/10 bg-slate-950 shadow-2xl">
        <div className="border-b border-white/10 bg-slate-900/70 px-5 py-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${type.className}`}>
                  {type.label}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <h2 className="text-xl font-bold leading-tight text-white">{details.name || 'Untitled activity'}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close activity details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm leading-6 text-slate-400">
            Itinerary details, logistics, and booking information for this activity.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-3">
            <DetailRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Schedule"
              value={`Day ${item.day_number} · ${formatTime(item)}`}
            />
            <DetailRow
              icon={<MapPin className="h-4 w-4" />}
              label="Location"
              value={details.address || 'No address provided'}
            />
            <DetailRow
              icon={<DollarSign className="h-4 w-4" />}
              label="Estimated cost"
              value={costText}
            />
            <DetailRow
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Current status"
              value={status.label}
            />
          </div>

          {(details.note || hasCoordinate(item)) && (
            <section className="mt-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Info className="h-4 w-4 text-indigo-300" />
                Additional information
              </h3>
              <div className="space-y-3">
                {details.note && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                    {details.note}
                  </div>
                )}
                {hasCoordinate(item) && (
                  <DetailRow
                    icon={<Navigation className="h-4 w-4" />}
                    label="Coordinates"
                    value={`${Number(details.lat).toFixed(5)}, ${Number(details.lng).toFixed(5)}`}
                  />
                )}
              </div>
            </section>
          )}

          {(details.airline || details.flight_number || details.departure_airport || details.arrival_airport || details.departure_time || details.arrival_time) && (
            <section className="mt-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Plane className="h-4 w-4 text-sky-300" />
                Flight details
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {(details.airline || details.flight_number) && (
                  <DetailRow
                    icon={<Tag className="h-4 w-4" />}
                    label="Flight"
                    value={`${details.airline || 'Airline'}${details.flight_number ? ` · ${details.flight_number}` : ''}`}
                  />
                )}
                {(details.departure_airport || details.arrival_airport) && (
                  <DetailRow
                    icon={<Navigation className="h-4 w-4" />}
                    label="Route"
                    value={`${details.departure_airport || 'Departure'} -> ${details.arrival_airport || 'Arrival'}`}
                  />
                )}
                {(details.departure_time || details.arrival_time) && (
                  <DetailRow
                    icon={<Clock className="h-4 w-4" />}
                    label="Flight time"
                    value={`${details.departure_time || 'TBD'} -> ${details.arrival_time || 'TBD'}`}
                  />
                )}
              </div>
            </section>
          )}

          {(details.stars || details.rating || details.price_per_night || details.total_price) && (
            <section className="mt-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Hotel className="h-4 w-4 text-emerald-300" />
                Lodging details
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {details.stars && (
                  <DetailRow icon={<Star className="h-4 w-4" />} label="Hotel class" value={`${details.stars} stars`} />
                )}
                {details.rating && (
                  <DetailRow icon={<Star className="h-4 w-4" />} label="Rating" value={`${details.rating}/10`} />
                )}
                {details.price_per_night && (
                  <DetailRow
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Price per night"
                    value={formatCurrency(details.price_per_night, details.currency || tripCurrency)}
                  />
                )}
              </div>
            </section>
          )}

          {bookingLink && (
            <section className="mt-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <ExternalLink className="h-4 w-4 text-indigo-300" />
                Booking reference
              </h3>
              {isExternalBooking ? (
                <a
                  href={bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-4 py-3 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/25"
                >
                  Open booking link
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 font-mono text-xs text-slate-300">
                  {bookingLink}
                </div>
              )}
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
