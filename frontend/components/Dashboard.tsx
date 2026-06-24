'use client';
import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ItineraryItem } from '@/types';
import { confirmItem, completeItem } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { getDestinationImage } from '@/components/TripCard';

// ─── Type configuration (no emojis) ───────────────────────────────────────────

const typeConfig: Record<string, { label: string; icon: string; dot: string; badge: string }> = {
  ATTRACTION: {
    label: 'Attraction',
    icon: '📸',
    dot: 'bg-violet-400',
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]',
  },
  MEAL: {
    label: 'Dining',
    icon: '🍽️',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
  },
  TRANSPORT: {
    label: 'Transport',
    icon: '🚕',
    dot: 'bg-sky-400',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]',
  },
  LODGING: {
    label: 'Lodging',
    icon: '🏨',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  SUGGESTED: { label: 'Suggested', className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  CONFIRMED: { label: 'Confirmed', className: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  COMPLETED: { label: 'Completed', className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
};

// ─── Sortable item card ────────────────────────────────────────────────────────

function SortableItem({
  item,
  tripDestination,
  onConfirm,
  onComplete,
  readOnly,
}: {
  item: ItineraryItem;
  tripDestination: string;
  onConfirm: (id: number) => void;
  onComplete: (id: number) => void;
  readOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id, disabled: readOnly });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const details = item.activity_details;
  const type = typeConfig[item.type] ?? { label: item.type, icon: '📌', dot: 'bg-slate-400', badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30 shadow-none' };
  const status = statusConfig[item.status] ?? statusConfig.SUGGESTED;
  let imgSrc = getDestinationImage(details.address || details.name || tripDestination);
  
  if (item.type === 'TRANSPORT') {
    imgSrc = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800&auto=format&fit=crop'; // Flight / Travel
  } else if (item.type === 'MEAL') {
    imgSrc = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop'; // Restaurant
  } else if (item.type === 'LODGING') {
    imgSrc = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop'; // Hotel
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative pl-8 mb-4 group"
    >
      {/* Timeline Node & Line */}
      <div className="absolute left-[11px] top-5 bottom-[-16px] w-[2px] bg-white/10 group-last:bg-transparent" />
      <div className={`absolute left-0 top-4 w-6 h-6 rounded-full border-[3px] border-slate-950 flex items-center justify-center z-10 ${status.className.split(' ')[1]} backdrop-blur-md`}>
        <div className={`w-1.5 h-1.5 rounded-full ${type.dot}`} />
      </div>

      <div className="relative bg-slate-900/40 backdrop-blur-xl hover:bg-slate-800/60 border border-white/10 hover:border-indigo-500/30 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-indigo-500/10 overflow-hidden flex items-stretch">
        
        {/* Thumbnail */}
        <div className="w-28 flex-shrink-0 relative hidden sm:block border-r border-white/5">
          <img src={imgSrc} alt={details.name} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/90" />
        </div>

        {/* Drag handle */}
        {!readOnly && (
          <div
            {...attributes}
            {...listeners}
            className="flex items-center px-3 cursor-grab active:cursor-grabbing text-slate-600 hover:text-indigo-400 select-none transition-colors"
          >
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="2" cy="3" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
              <circle cx="2" cy="9" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="9" r="1.5" fill="currentColor"/>
              <circle cx="2" cy="15" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="15" r="1.5" fill="currentColor"/>
            </svg>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 py-3 pr-4 min-w-0">
          {/* Top row: name + time + type */}
          <div className="flex items-start justify-between gap-4 mb-1">
            <h4 className="text-white font-semibold text-[15px] leading-snug group-hover:text-indigo-200 transition-colors truncate">{details.name}</h4>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-bold ${type.badge}`}>
                {type.icon} {type.label}
              </span>
              {(item.start_time || item.end_time) && (
                <span className="text-slate-400 bg-black/20 px-2 py-0.5 rounded border border-white/5 text-xs font-mono">
                  {item.start_time}{item.end_time ? ` – ${item.end_time}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Location & Cost Row */}
          <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
            {details.address && (
              <span className="flex items-center gap-1 truncate max-w-[60%]">
                <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{details.address}</span>
              </span>
            )}
            {details.estimated_cost != null && details.estimated_cost > 0 && (
              <span className="flex items-center gap-1 font-medium text-slate-400 border-l border-white/10 pl-4">
                <span className="text-slate-500">💰</span>
                {formatCurrency(details.estimated_cost)}
              </span>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
            {details.booking_link && (
              details.booking_link.startsWith('http') ? (
                <a 
                  href={details.booking_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onPointerDown={(e) => e.stopPropagation()} 
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    item.type === 'TRANSPORT' 
                      ? 'bg-sky-500 hover:bg-sky-400 text-sky-950' 
                      : 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
                  }`}
                >
                  {item.type === 'TRANSPORT' ? '✈️ Book Flight' : '🏨 Book Hotel'}
                </a>
              ) : (
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('openBookingModal', { detail: { item } }))}
                  onPointerDown={(e) => e.stopPropagation()} 
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    item.type === 'TRANSPORT' 
                      ? 'bg-sky-500 hover:bg-sky-400 text-sky-950' 
                      : 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
                  }`}
                >
                  {item.type === 'TRANSPORT' ? '✈️ Book Flight' : '🏨 Book Hotel'}
                </button>
              )
            )}

            {/* Status & Confirm Buttons */}
            <div className="ml-auto flex items-center gap-2">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${status.className}`}>
                {status.label}
              </span>

              {!readOnly && item.status === 'SUGGESTED' && (
                <button
                  onClick={() => onConfirm(item.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all font-medium"
                >
                  ✓ Confirm
                </button>
              )}
              {!readOnly && item.status === 'CONFIRMED' && (
                <button
                  onClick={() => onComplete(item.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all font-medium"
                >
                  ✓ Mark done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Completion overlay stripe */}
      {item.status === 'COMPLETED' && (
        <div className="absolute inset-y-0 left-8 right-0 bg-emerald-900/10 rounded-2xl pointer-events-none" />
      )}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
import BookingModal from './BookingModal';

export default function Dashboard({
  tripId,
  items,
  tripDestination,
  onItemsChange,
  readOnly,
  tripStatus,
}: {
  tripId: number;
  items: ItineraryItem[];
  tripDestination: string;
  onItemsChange: (items: ItineraryItem[]) => void;
  readOnly?: boolean;
  tripStatus?: string;
}) {
  // Listen for currency change
  const [_, setForceRender] = useState(0);
  
  // Payment State
  const [isPaying, setIsPaying] = useState(false);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingItem, setSelectedBookingItem] = useState<any>(null);
  const [bookingType, setBookingType] = useState<'FLIGHT' | 'HOTEL'>('FLIGHT');
  const [bookingItineraryId, setBookingItineraryId] = useState<number | undefined>();

  useEffect(() => {
    const handler = () => setForceRender(r => r + 1);
    window.addEventListener('currencyChange', handler);
    
    const handleOpenBooking = (e: any) => {
      const item = e.detail.item;
      setSelectedBookingItem({ id: item.activity_details.booking_link, ...item.activity_details });
      setBookingType(item.type === 'TRANSPORT' ? 'FLIGHT' : 'HOTEL');
      setBookingItineraryId(item.id);
      setBookingModalOpen(true);
    };
    window.addEventListener('openBookingModal', handleOpenBooking);
    
    return () => {
      window.removeEventListener('currencyChange', handler);
      window.removeEventListener('openBookingModal', handleOpenBooking);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const days = Array.from(new Set(items.map((i) => i.day_number))).sort((a, b) => a - b);
  
  const isAllConfirmed = items.length > 0 && items.every(i => i.status !== 'SUGGESTED');
  const showPaymentBanner = isAllConfirmed && !readOnly && tripStatus !== 'ACTIVE';
  const showSuccessBanner = tripStatus === 'ACTIVE';
  const totalCost = items.reduce((sum, item) => sum + (item.activity_details?.estimated_cost || 0), 0);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    onItemsChange(arrayMove(items, oldIndex, newIndex));
  }

  async function handleConfirm(id: number) {
    await confirmItem(id);
    onItemsChange(items.map((i) => (i.id === id ? { ...i, status: 'CONFIRMED' } : i)));
  }

  async function handlePayment() {
    setIsPaying(true);
    try {
      const token = localStorage.getItem('access_token');
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/payments/create-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ trip_id: tripId })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Payment failed: ${errorData.detail}`);
        setIsPaying(false);
        return;
      }
      
      const data = await res.json();
      window.location.href = data.url; // Redirect to VNPay
    } catch (e) {
      alert('Network error while processing payment.');
      setIsPaying(false);
    }
  }

  async function handleComplete(id: number) {
    await completeItem(id);
    onItemsChange(items.map((i) => (i.id === id ? { ...i, status: 'COMPLETED' } : i)));
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-600">
        <p className="text-base font-medium text-slate-500 mb-1">No itinerary yet</p>
        <p className="text-sm">Chat with the AI assistant to start planning</p>
      </div>
    );
  }

  return (
    <>
      {showPaymentBanner && (
        <div className="mb-8 p-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(99,102,241,0.1)]">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Ready for Checkout</h3>
            <p className="text-sm text-indigo-200">All activities have been confirmed. Proceed to payment to finalize your booking.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-indigo-300 uppercase tracking-wider font-bold mb-0.5">Total Amount</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalCost)}</p>
            </div>
            <button
              onClick={handlePayment}
              disabled={isPaying}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
            >
              {isPaying ? 'Processing...' : 'Pay with VNPay'}
            </button>
          </div>
        </div>
      )}

      {showSuccessBanner && (
        <div className="mb-8 p-6 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/40 text-emerald-400 text-2xl">
              🎉
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-0.5">Payment Successful & Booking Confirmed</h3>
              <p className="text-sm text-emerald-200">Your trip is fully paid and ready to go! Have a safe and wonderful journey.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-emerald-300 uppercase tracking-wider font-bold mb-0.5">Total Paid</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalCost)}</p>
            </div>
            <div className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold rounded-xl shadow-lg flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Paid
            </div>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-8">
          {days.map((day) => {
            const dayItems = items.filter((i) => i.day_number === day);
            const confirmedCount = dayItems.filter(i => i.status !== 'SUGGESTED').length;

            return (
              <div key={day}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      Day {day}
                    </span>
                    <span className="text-xs text-slate-600">
                      {confirmedCount}/{dayItems.length} confirmed
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-white/[0.08]" />
                  {/* Mini progress */}
                  <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500/60 rounded-full transition-all"
                      style={{ width: `${dayItems.length > 0 ? (confirmedCount / dayItems.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Items */}
                <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div>
                    {dayItems.map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        tripDestination={tripDestination}
                        onConfirm={handleConfirm}
                        onComplete={handleComplete}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>

      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        type={bookingType}
        itemDetails={selectedBookingItem}
        tripId={tripId}
        itineraryItemId={bookingItineraryId}
        onSuccess={(result) => {
          setBookingModalOpen(false);
          // Mark the itinerary item as CONFIRMED in local state
          if (bookingItineraryId) {
            onItemsChange(items.map((i) => (i.id === bookingItineraryId ? { ...i, status: 'CONFIRMED' } : i)));
          }
          alert(`Booking successful! PNR: ${result.pnr}`);
        }}
      />
    </>
  );
}
