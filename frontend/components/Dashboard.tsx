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
import { confirmItem, confirmItems, completeItem, updateTripItinerary } from '@/lib/api';
import { formatCurrency, extractItemCostRaw, extractItemCostInVND } from '@/lib/currency';
import { getDestinationImage } from '@/components/TripCard';
import { ChevronDown, ChevronRight } from 'lucide-react';

// ─── Type configuration (no emojis) ───────────────────────────────────────────

const typeConfig: Record<string, { label: string; icon: string; dot: string; dotGlow: string; badge: string; cardHover: string }> = {
  ATTRACTION: {
    label: 'Attraction',
    icon: 'A',
    dot: 'bg-violet-400',
    dotGlow: 'shadow-[0_0_12px_rgba(167,139,250,0.6)]',
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]',
    cardHover: 'hover:border-violet-500/30 hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)]',
  },
  MEAL: {
    label: 'Dining',
    icon: 'D',
    dot: 'bg-amber-400',
    dotGlow: 'shadow-[0_0_12px_rgba(251,191,36,0.6)]',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    cardHover: 'hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]',
  },
  TRANSPORT: {
    label: 'Transport',
    icon: 'T',
    dot: 'bg-sky-400',
    dotGlow: 'shadow-[0_0_12px_rgba(56,189,248,0.6)]',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]',
    cardHover: 'hover:border-sky-500/30 hover:shadow-[0_8px_30px_rgba(14,165,233,0.15)]',
  },
  LODGING: {
    label: 'Lodging',
    icon: 'L',
    dot: 'bg-emerald-400',
    dotGlow: 'shadow-[0_0_12px_rgba(52,211,153,0.6)]',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    cardHover: 'hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]',
  },
  OTHER: {
    label: 'Other',
    icon: 'O',
    dot: 'bg-slate-400',
    dotGlow: 'shadow-[0_0_12px_rgba(148,163,184,0.6)]',
    badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30 shadow-[0_0_10px_rgba(148,163,184,0.15)]',
    cardHover: 'hover:border-slate-500/30 hover:shadow-[0_8px_30px_rgba(148,163,184,0.15)]',
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  SUGGESTED: { label: 'Suggested', className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  CONFIRMED: { label: 'Confirmed', className: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]' },
  COMPLETED: { label: 'Completed', className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' },
};

type PendingBulkConfirm = {
  title: string;
  description: string;
  itemIds: number[];
} | null;

// ─── Sortable item card ────────────────────────────────────────────────────────

function SortableItem({
  item,
  tripDestination,
  tripCurrency,
  onConfirm,
  onComplete,
  onOpenDetails,
  readOnly,
}: {
  item: ItineraryItem;
  tripDestination: string;
  tripCurrency?: string;
  onConfirm: (id: number) => void;
  onComplete: (id: number) => void;
  onOpenDetails: (item: ItineraryItem) => void;
  readOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id, disabled: readOnly });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const details = item.activity_details;
  const type = typeConfig[item.type] ?? { label: item.type, icon: 'I', dot: 'bg-slate-400', badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30 shadow-none' };
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
      <div className="absolute left-[11px] top-5 bottom-[-24px] w-[2px] bg-gradient-to-b from-white/10 to-transparent group-last:bg-transparent" />
      <div className={`absolute left-0 top-4 w-6 h-6 rounded-full border-[3px] border-[#09090b] flex items-center justify-center z-10 ${status.className.split(' ')[1]} backdrop-blur-md transition-shadow duration-300 group-hover:${type.dotGlow}`}>
        <div className={`w-2 h-2 rounded-full ${type.dot}`} />
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenDetails(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetails(item);
          }
        }}
        className={`relative bg-white/[0.02] backdrop-blur-3xl hover:bg-white/[0.04] border border-white/5 rounded-3xl transition-all duration-500 shadow-xl overflow-hidden flex items-stretch cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${type.cardHover}`}
      >
        
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
            onClick={(e) => e.stopPropagation()}
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
              <span className="hidden lg:inline-flex text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 text-slate-500 group-hover:text-slate-300 transition">
                Details
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
            {(() => {
              const { cost, currency: itemCurrency } = extractItemCostRaw(details);
              if (cost > 0) {
                return (
                  <span className="flex items-center gap-1 font-medium text-slate-400 border-l border-white/10 pl-4">
                    {formatCurrency(cost, itemCurrency || tripCurrency)}
                  </span>
                );
              }
              return null;
            })()}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              {details.booking_link && (
                details.booking_link.startsWith('http') ? (
                  <a 
                    href={details.booking_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()} 
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      item.type === 'TRANSPORT' 
                        ? 'bg-sky-500 hover:bg-sky-400 text-sky-950' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
                    }`}
                  >
                    {item.type === 'TRANSPORT' ? 'Book Flight' : 'Book Hotel'}
                  </a>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('openBookingModal', { detail: { item } }));
                    }}
                    onPointerDown={(e) => e.stopPropagation()} 
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      item.type === 'TRANSPORT' 
                        ? 'bg-sky-500 hover:bg-sky-400 text-sky-950' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
                    }`}
                  >
                    {item.type === 'TRANSPORT' ? 'Book Flight' : 'Book Hotel'}
                  </button>
                )
              )}
              
              {!readOnly && item.status === 'SUGGESTED' && (item.type === 'LODGING' || (item.type === 'TRANSPORT' && (details.airline || details.flight_number || details.booking_link))) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('openAltModal', { detail: { item } }));
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition"
                >
                  Change
                </button>
              )}
            </div>

            {/* Status & Confirm Buttons */}
            <div className="ml-auto flex items-center gap-2">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${status.className}`}>
                {status.label}
              </span>

              {!readOnly && item.status === 'SUGGESTED' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm(item.id);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all font-medium"
                >
                  Confirm
                </button>
              )}
              {!readOnly && item.status === 'CONFIRMED' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete(item.id);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all font-medium"
                >
                  Mark done
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
import AlternativesModal from './AlternativesModal';
import ActivityDetailPanel from './ActivityDetailPanel';

export default function Dashboard({
  tripId,
  items,
  tripDestination,
  tripCurrency,
  onItemsChange,
  readOnly,
  tripStatus,
}: {
  tripId: number;
  items: ItineraryItem[];
  tripDestination: string;
  tripCurrency?: string;
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

  // Alternatives Modal State
  const [altModalOpen, setAltModalOpen] = useState(false);
  const [selectedAltItem, setSelectedAltItem] = useState<ItineraryItem | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<ItineraryItem | null>(null);
  const [pendingBulkConfirm, setPendingBulkConfirm] = useState<PendingBulkConfirm>(null);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [orderSaving, setOrderSaving] = useState(false);

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

    const handleOpenAlt = (e: any) => {
      setSelectedAltItem(e.detail.item);
      setAltModalOpen(true);
    };
    window.addEventListener('openAltModal', handleOpenAlt);
    
    return () => {
      window.removeEventListener('currencyChange', handler);
      window.removeEventListener('openBookingModal', handleOpenBooking);
      window.removeEventListener('openAltModal', handleOpenAlt);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const timelineItems = items.filter(i => 
    i.type !== 'OTHER' && 
    !i.activity_details?.name?.toLowerCase().includes('local transport') &&
    !i.activity_details?.name?.toLowerCase().includes('chi phí đi lại')
  );

  const days = Array.from(new Set(timelineItems.map((i) => i.day_number))).sort((a, b) => a - b);
  const isAllConfirmed = timelineItems.length > 0 && timelineItems.every(i => i.status !== 'SUGGESTED');
  const showPaymentBanner = isAllConfirmed && !readOnly && tripStatus !== 'ACTIVE';
  const showSuccessBanner = tripStatus === 'ACTIVE';
  const totalCostVND = timelineItems.reduce((sum, item) => sum + extractItemCostInVND(item.activity_details, tripCurrency), 0);

  function withSortOrder(nextItems: ItineraryItem[]) {
    const orderByDay = new Map<number, number>();
    return nextItems.map((item) => {
      const nextOrder = orderByDay.get(item.day_number) ?? 0;
      orderByDay.set(item.day_number, nextOrder + 1);
      return {
        ...item,
        activity_details: {
          ...item.activity_details,
          _sort_order: nextOrder,
        },
      };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (readOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previousItems = items;
    const reorderedItems = withSortOrder(arrayMove(items, oldIndex, newIndex));
    onItemsChange(reorderedItems);

    setOrderSaving(true);
    try {
      await updateTripItinerary(tripId, reorderedItems);
    } catch (error) {
      onItemsChange(previousItems);
      alert('Could not save the new timeline order. Please try again.');
    } finally {
      setOrderSaving(false);
    }
  }

  async function handleConfirm(id: number) {
    await confirmItem(id);
    onItemsChange(items.map((i) => (i.id === id ? { ...i, status: 'CONFIRMED' } : i)));
  }

  function openConfirmDay(day: number) {
    const dayItems = timelineItems.filter((item) => item.day_number === day && item.status === 'SUGGESTED');
    if (dayItems.length === 0) return;
    setPendingBulkConfirm({
      title: `Confirm Day ${day}`,
      description: `This will mark ${dayItems.length} suggested activit${dayItems.length > 1 ? 'ies' : 'y'} on Day ${day} as confirmed.`,
      itemIds: dayItems.map((item) => item.id),
    });
  }

  function openConfirmAll() {
    const suggestedItems = timelineItems.filter((item) => item.status === 'SUGGESTED');
    if (suggestedItems.length === 0) return;
    setPendingBulkConfirm({
      title: 'Confirm All Activities',
      description: `This will mark ${suggestedItems.length} suggested activit${suggestedItems.length > 1 ? 'ies' : 'y'} across the trip as confirmed.`,
      itemIds: suggestedItems.map((item) => item.id),
    });
  }

  function toggleDay(day: number) {
    setCollapsedDays((current) => {
      const next = new Set(current);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  async function handleBulkConfirm() {
    if (!pendingBulkConfirm || pendingBulkConfirm.itemIds.length === 0) return;
    setBulkConfirming(true);
    try {
      await confirmItems(pendingBulkConfirm.itemIds);
      const ids = new Set(pendingBulkConfirm.itemIds);
      onItemsChange(items.map((item) => (
        ids.has(item.id) && item.status === 'SUGGESTED'
          ? { ...item, status: 'CONFIRMED' }
          : item
      )));
      setPendingBulkConfirm(null);
    } finally {
      setBulkConfirming(false);
    }
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

  const handleAlternativeSelected = async (opt: any) => {
    if (!selectedAltItem) return;
    try {
      const isFlight = selectedAltItem.type === 'TRANSPORT';
      const newDetails = { ...selectedAltItem.activity_details, ...opt };
      
      const newCost = isFlight ? opt.price : (opt.total_price || opt.price_per_night);
      newDetails.estimated_cost = newCost;
      
      const updatedItem = {
        ...selectedAltItem,
        activity_details: newDetails
      };

      const token = localStorage.getItem('access_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const newItems = items.map((i) => (i.id === updatedItem.id ? updatedItem : i));
      
      const res = await fetch(`${apiUrl}/trips/${tripId}/itinerary`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: newItems })
      });
      
      if (res.ok) {
        onItemsChange(newItems);
        setAltModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to update alternative', err);
    }
  };

  return (
    <>
      {showPaymentBanner && (
        <div className="mb-8 p-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Ready for Checkout</h3>
            <p className="text-sm text-indigo-200">All activities have been confirmed. Proceed to payment to finalize your booking.</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="text-right">
              <p className="text-xs text-indigo-300 uppercase tracking-wider font-bold mb-0.5">Total Amount</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalCostVND, 'VND')}</p>
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
        <div className="mb-8 p-6 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/40 text-emerald-400 text-2xl">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-0.5">Payment Successful & Booking Confirmed</h3>
              <p className="text-sm text-emerald-200">Your trip is fully paid and ready to go! Have a safe and wonderful journey.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="text-right">
              <p className="text-xs text-emerald-300 uppercase tracking-wider font-bold mb-0.5">Total Paid</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalCostVND, 'VND')}</p>
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
          {!readOnly && timelineItems.some((item) => item.status === 'SUGGESTED') && (
            <div className="flex flex-col gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Review faster</h3>
                <p className="mt-1 text-xs text-indigo-200">
                  Confirm all suggested activities at once, or review day by day below.
                </p>
              </div>
              <button
                type="button"
                onClick={openConfirmAll}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 active:scale-95"
              >
                Confirm All
              </button>
            </div>
          )}

          {days.map((day) => {
            const dayItems = timelineItems.filter((i) => i.day_number === day);
            const confirmedCount = dayItems.filter(i => i.status !== 'SUGGESTED').length;
            const suggestedCount = dayItems.filter(i => i.status === 'SUGGESTED').length;
            const isCollapsed = collapsedDays.has(day);

            return (
              <div key={day}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-expanded={!isCollapsed}
                    className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-indigo-500/30 hover:bg-white/[0.06]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-slate-300">
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                      Day {day}
                    </span>
                    <span className="hidden text-xs text-slate-600 sm:inline">
                      {confirmedCount}/{dayItems.length} confirmed
                    </span>
                  </button>
                  <div className="flex-1 h-px bg-white/[0.08]" />
                  {/* Mini progress */}
                  <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500/60 rounded-full transition-all"
                      style={{ width: `${dayItems.length > 0 ? (confirmedCount / dayItems.length) * 100 : 0}%` }}
                    />
                  </div>
                  {!readOnly && suggestedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => openConfirmDay(day)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-white"
                    >
                      Confirm Day
                    </button>
                  )}
                </div>

                <div
                  className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${
                    isCollapsed
                      ? 'grid-rows-[0fr] opacity-0 -translate-y-1'
                      : 'grid-rows-[1fr] opacity-100 translate-y-0'
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="pt-0.5">
                        {dayItems.map((item) => (
                          <SortableItem
                            key={item.id}
                            item={item}
                            tripDestination={tripDestination}
                            tripCurrency={tripCurrency}
                            onConfirm={handleConfirm}
                            onComplete={handleComplete}
                            onOpenDetails={setSelectedDetailItem}
                            readOnly={readOnly}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                </div>
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
      
      {selectedAltItem && (
        <AlternativesModal
          isOpen={altModalOpen}
          onClose={() => setAltModalOpen(false)}
          tripId={tripId}
          itineraryItemId={selectedAltItem.id}
          onSelect={handleAlternativeSelected}
        />
      )}

      <ActivityDetailPanel
        item={selectedDetailItem}
        isOpen={!!selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
        tripCurrency={tripCurrency}
      />

      {pendingBulkConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-white">{pendingBulkConfirm.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{pendingBulkConfirm.description}</p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Completed activities will stay completed. You can still mark confirmed activities as done later.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingBulkConfirm(null)}
                disabled={bulkConfirming}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkConfirm}
                disabled={bulkConfirming}
                className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
              >
                {bulkConfirming ? 'Confirming...' : `Confirm ${pendingBulkConfirm.itemIds.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
