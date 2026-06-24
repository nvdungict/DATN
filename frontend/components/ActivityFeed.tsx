'use client';
import type { Trip } from '@/types';

interface ActivityItem {
  icon: string;
  text: string;
  time: string;
  color: string;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diff = Math.floor((now - past) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ActivityFeed({ trips }: { trips: Trip[] }) {
  const activities: ActivityItem[] = [];

  // Derive activities from trips (sorted newest first)
  const sorted = [...trips].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  sorted.slice(0, 6).forEach(trip => {
    activities.push({
      icon: '✨',
      text: `AI generated "${trip.title}"`,
      time: getRelativeTime(trip.created_at),
      color: 'bg-indigo-500/20 text-indigo-400',
    });

    if (trip.status === 'COMPLETED') {
      activities.push({
        icon: '✅',
        text: `Completed trip to ${trip.destination}`,
        time: getRelativeTime(trip.updated_at),
        color: 'bg-emerald-500/20 text-emerald-400',
      });
    } else if (trip.status === 'ACTIVE') {
      activities.push({
        icon: '🚀',
        text: `Started adventure in ${trip.destination}`,
        time: getRelativeTime(trip.updated_at),
        color: 'bg-amber-500/20 text-amber-400',
      });
    }
  });

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-600">
        <span className="block text-3xl mb-2">📋</span>
        <p className="text-sm">No activity yet. Start planning!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.slice(0, 8).map((item, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition group"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${item.color}`}>
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-300 text-sm truncate">{item.text}</p>
          </div>
          <span className="text-slate-600 text-xs flex-shrink-0">{item.time}</span>
        </div>
      ))}
    </div>
  );
}
