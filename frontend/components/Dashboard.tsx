'use client';
import { useState, useCallback } from 'react';
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

const typeIcons: Record<string, string> = {
  ATTRACTION: '🏛️',
  MEAL: '🍽️',
  TRANSPORT: '🚌',
  LODGING: '🏨',
};

const typeColors: Record<string, string> = {
  ATTRACTION: 'border-l-indigo-400',
  MEAL: 'border-l-amber-400',
  TRANSPORT: 'border-l-sky-400',
  LODGING: 'border-l-emerald-400',
};

function SortableItem({
  item,
  onConfirm,
  onComplete,
}: {
  item: ItineraryItem;
  onConfirm: (id: number) => void;
  onComplete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const details = item.activity_details;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white/5 border border-white/10 border-l-4 ${typeColors[item.type] || 'border-l-white/20'} rounded-xl p-4 mb-3 hover:bg-white/8 transition group`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-slate-600 hover:text-slate-400 select-none"
        >
          ⠿
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{typeIcons[item.type]}</span>
            <h4 className="text-white font-medium truncate">{details.name}</h4>
            <span className="ml-auto text-slate-500 text-xs flex-shrink-0">
              {item.start_time} {item.end_time ? `→ ${item.end_time}` : ''}
            </span>
          </div>
          {details.address && (
            <p className="text-slate-400 text-sm truncate">📍 {details.address}</p>
          )}
          {details.note && (
            <p className="text-slate-500 text-xs mt-1">{details.note}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {item.status === 'SUGGESTED' && (
              <button
                onClick={() => onConfirm(item.id)}
                className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/40 transition"
              >
                ✓ Confirm
              </button>
            )}
            {item.status === 'CONFIRMED' && (
              <button
                onClick={() => onComplete(item.id)}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/40 transition"
              >
                ✓ Complete
              </button>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                item.status === 'COMPLETED'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : item.status === 'CONFIRMED'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'bg-slate-500/20 text-slate-400'
              }`}
            >
              {item.status}
            </span>
            {details.estimated_cost != null && (
              <span className="ml-auto text-slate-400 text-xs">${details.estimated_cost}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({
  tripId,
  items,
  onItemsChange,
}: {
  tripId: number;
  items: ItineraryItem[];
  onItemsChange: (items: ItineraryItem[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Group items by day
  const days = Array.from(new Set(items.map((i) => i.day_number))).sort((a, b) => a - b);

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

  async function handleComplete(id: number) {
    await completeItem(id);
    onItemsChange(items.map((i) => (i.id === id ? { ...i, status: 'COMPLETED' } : i)));
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <span className="text-4xl mb-3">📋</span>
        <p>No itinerary yet. Chat with AI to plan!</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {days.map((day) => {
          const dayItems = items.filter((i) => i.day_number === day);
          return (
            <div key={day}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-sm font-bold">
                  {day}
                </div>
                <span className="text-white font-semibold">Day {day}</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Items */}
              <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="pl-5 border-l border-white/10">
                  {dayItems.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onConfirm={handleConfirm}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
