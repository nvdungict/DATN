'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Filter, AlignLeft, CalendarDays, ExternalLink, X, Clock } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import FloatingCopilot from '@/components/FloatingCopilot';
import { getTrips, updateTrip, getTripItinerary } from '@/lib/api';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isWithinInterval, addDays, differenceInDays } from 'date-fns';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import * as Dialog from '@radix-ui/react-dialog';

// --- Draggable Trip Chip ---
function DraggableTrip({ trip, isOverlay = false }: { trip: any, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `trip-${trip.id}`,
    data: trip,
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  
  // Color coding by status
  let bgGradient = 'from-slate-600/80 to-slate-500/80';
  if (trip.status === 'ACTIVE') bgGradient = 'from-emerald-600/80 to-teal-500/80';
  else if (trip.status === 'PLANNED') bgGradient = 'from-indigo-600/80 to-violet-600/80';
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative px-2 py-1.5 mb-1 text-xs font-semibold rounded-lg bg-gradient-to-r ${bgGradient} text-white truncate shadow-lg shadow-black/20 hover:scale-[1.02] cursor-grab active:cursor-grabbing transition-transform ${isDragging && !isOverlay ? 'opacity-30' : 'opacity-100'} ${isOverlay ? 'shadow-2xl scale-105 z-50' : ''}`}
    >
      {trip.destination}
    </div>
  );
}

// --- Droppable Day Cell ---
function DroppableDay({ day, monthStart, trips, onDayClick }: { day: Date, monthStart: Date, trips: any[], onDayClick: (d: Date, t: any[]) => void }) {
  const dateStr = day.toISOString();
  const { isOver, setNodeRef } = useDroppable({ id: dateStr, data: { day } });

  const isCurrentMonth = isSameMonth(day, monthStart);
  const isToday = isSameDay(day, new Date());

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick(day, trips)}
      className={`min-h-[120px] p-2 flex flex-col rounded-xl border transition-colors cursor-pointer
        ${!isCurrentMonth ? 'bg-transparent border-transparent opacity-30' : isToday ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}
        ${isOver ? 'bg-indigo-500/20 border-indigo-400 ring-2 ring-indigo-400/50' : ''}
      `}
    >
      <span className={`text-sm font-medium mb-2 ${isToday ? 'text-indigo-400' : 'text-slate-300'}`}>
        {format(day, 'd')}
      </span>
      <div className="flex-1 overflow-hidden space-y-1">
        {trips.map(trip => (
          <DraggableTrip key={trip.id} trip={trip} />
        ))}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Views & Filters
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  
  // Day View Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayTrips, setSelectedDayTrips] = useState<any[]>([]);
  const [dayItineraries, setDayItineraries] = useState<Record<number, any[]>>({});
  const [loadingItineraries, setLoadingItineraries] = useState(false);

  useEffect(() => {
    loadTrips();
  }, []);

  async function loadTrips() {
    try {
      const data = await getTrips();
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load trips for calendar:', err);
    } finally {
      setLoading(false);
    }
  }

  // --- DND Handlers ---
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const trip = active.data.current as any;
    const targetDay = over.data.current?.day as Date;

    if (!trip || !targetDay) return;

    // Calculate new dates
    const oldStart = new Date(trip.start_date);
    const oldEnd = new Date(trip.end_date);
    const duration = differenceInDays(oldEnd, oldStart);

    const newStart = new Date(targetDay);
    const newEnd = addDays(newStart, duration);

    const updatedTripStr = {
      start_date: format(newStart, 'yyyy-MM-dd'),
      end_date: format(newEnd, 'yyyy-MM-dd')
    };

    // Optimistic UI Update
    setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, ...updatedTripStr } : t));

    try {
      await updateTrip(trip.id, updatedTripStr);
    } catch (err) {
      console.error("Failed to move trip", err);
      loadTrips(); // Revert on failure
    }
  }

  // --- Day Modal Handlers ---
  async function handleDayClick(day: Date, dayTrips: any[]) {
    setSelectedDay(day);
    setSelectedDayTrips(dayTrips);
    setIsModalOpen(true);
    setLoadingItineraries(true);
    
    const its: Record<number, any[]> = {};
    for (const t of dayTrips) {
      try {
        const fullItinerary = await getTripItinerary(t.id);
        // Filter itinerary for this specific day
        const tripStart = new Date(t.start_date);
        tripStart.setHours(0,0,0,0);
        const dayOffset = differenceInDays(day, tripStart) + 1;
        its[t.id] = fullItinerary.filter((i: any) => i.day_number === dayOffset);
      } catch (e) {}
    }
    setDayItineraries(its);
    setLoadingItineraries(false);
  }

  function getGCalLink(trip: any) {
    const s = new Date(trip.start_date).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const e = new Date(new Date(trip.end_date).getTime() + 86400000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(trip.title)}&dates=${s}/${e}&location=${encodeURIComponent(trip.destination)}`;
  }

  // --- Grid Calculations ---
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Apply filters
  const filteredTrips = trips.filter(t => filterStatus === 'ALL' || t.status === filterStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 flex text-white overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full p-6 lg:p-10 space-y-6">
          
          {/* Header & Controls */}
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                <CalendarIcon className="w-8 h-8 text-indigo-400" /> Trip Calendar
              </h1>
              <p className="text-slate-400">Plan, move, and visualize your upcoming adventures.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Filters */}
              <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                {['ALL', 'PLANNED', 'ACTIVE', 'COMPLETED'].map(s => (
                  <button
                    key={s} onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterStatus === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <CalendarDays className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('timeline')} className={`p-2 rounded-lg transition ${viewMode === 'timeline' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <AlignLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Month Navigator */}
              {viewMode === 'grid' && (
                <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1 border border-white/5">
                  <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-lg transition">
                    <ChevronLeft className="w-4 h-4 text-slate-300" />
                  </button>
                  <h2 className="text-sm font-bold min-w-[100px] text-center">
                    {format(currentDate, 'MMMM yyyy')}
                  </h2>
                  <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-lg transition">
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main View Area */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl min-h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : viewMode === 'grid' ? (
              <DndContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-7 mb-4">
                  {weekDays.map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-white/10">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => {
                    const dTrips = filteredTrips.filter(t => {
                      const s = new Date(t.start_date); s.setHours(0,0,0,0);
                      const e = new Date(t.end_date); e.setHours(23,59,59,999);
                      return isWithinInterval(day, { start: s, end: e });
                    });
                    return (
                      <DroppableDay 
                        key={day.toString()} 
                        day={day} 
                        monthStart={monthStart} 
                        trips={dTrips} 
                        onDayClick={handleDayClick} 
                      />
                    );
                  })}
                </div>
              </DndContext>
            ) : (
              /* Timeline View */
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[800px]">
                  <div className="flex border-b border-white/10 pb-4 mb-4">
                    <div className="w-64 flex-shrink-0 font-semibold text-slate-400 uppercase text-sm">Trip Details</div>
                    <div className="flex-1 font-semibold text-slate-400 uppercase text-sm">Duration Timeline</div>
                  </div>
                  {filteredTrips.sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).map(trip => {
                    const tStart = new Date(trip.start_date);
                    const tEnd = new Date(trip.end_date);
                    const isUpcoming = tStart > new Date();
                    return (
                      <div key={trip.id} className="flex items-center py-4 border-b border-white/5 hover:bg-white/5 transition px-2 rounded-xl">
                        <div className="w-64 flex-shrink-0 pr-4">
                          <h4 className="font-bold text-white truncate text-base">{trip.title}</h4>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> {trip.destination}</div>
                          <div className="text-xs text-indigo-300 mt-1">{format(tStart, 'MMM d')} - {format(tEnd, 'MMM d, yyyy')}</div>
                        </div>
                        <div className="flex-1 relative h-10 bg-black/20 rounded-full overflow-hidden border border-white/5 flex items-center px-4">
                          <div className="absolute left-0 w-full h-full flex justify-between px-2 text-[10px] text-slate-600 font-bold items-center">
                            <span>Start</span><span>End</span>
                          </div>
                          {/* Simplified visualization for timeline row */}
                          <div className={`relative z-10 w-full h-4 rounded-full bg-gradient-to-r ${isUpcoming ? 'from-indigo-600 to-violet-600' : 'from-slate-600 to-slate-500'} shadow-lg`}></div>
                        </div>
                        <div className="ml-4">
                          <a href={getGCalLink(trip)} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition flex items-center justify-center">
                            <CalendarIcon className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <FloatingCopilot />

      {/* --- Detailed Day View Modal --- */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-3xl p-8 z-[101] shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Dialog.Title className="text-2xl font-bold text-white">
                  {selectedDay ? format(selectedDay, 'EEEE, MMMM do') : ''}
                </Dialog.Title>
                <p className="text-slate-400 mt-1">Detailed Itinerary for this day</p>
              </div>
              <Dialog.Close asChild>
                <button className="p-2 rounded-full hover:bg-white/10 text-slate-400 transition">
                  <X className="w-6 h-6" />
                </button>
              </Dialog.Close>
            </div>

            {selectedDayTrips.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No trips scheduled for this day.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {selectedDayTrips.map(trip => (
                  <div key={trip.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-white">{trip.title}</h3>
                        <p className="text-sm text-slate-400 flex items-center gap-1 mt-1"><MapPin className="w-4 h-4"/> {trip.destination}</p>
                      </div>
                      <div className="flex gap-2">
                        <a href={getGCalLink(trip)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/40 transition flex items-center gap-1.5">
                          <ExternalLink className="w-3 h-3" /> Sync GCal
                        </a>
                        <Link href={`/trips/${trip.id}`} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition">
                          View Trip
                        </Link>
                      </div>
                    </div>

                    {loadingItineraries ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-12 bg-white/5 rounded-xl w-full"></div>
                        <div className="h-12 bg-white/5 rounded-xl w-full"></div>
                      </div>
                    ) : dayItineraries[trip.id]?.length > 0 ? (
                      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                        {dayItineraries[trip.id].map((item: any, idx: number) => (
                          <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-indigo-500 text-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                              <Clock className="w-4 h-4 text-white" />
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white/5 border border-white/5 shadow-xl">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-white text-sm">{item.activity_details?.name || "Activity"}</h4>
                                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{item.start_time?.slice(0,5)}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-2">{item.activity_details?.address || ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No specific activities planned for this day yet.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
