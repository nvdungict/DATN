'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getNotifications, markNotificationRead, respondToInvite } from '@/lib/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const fetchNotifs = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleRespond = async (tripId: number, action: 'ACCEPT' | 'REJECT') => {
    try {
      await respondToInvite(tripId, action);
      await fetchNotifs();
      if (action === 'ACCEPT') {
        router.push(`/trips/${tripId}`);
      }
    } catch (e) {
      alert("Error responding to invite");
    }
  };

  const handleRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      await fetchNotifs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewTrip = async (id: number, tripId: number) => {
    try {
      await markNotificationRead(id);
      await fetchNotifs();
      router.push(`/trips/${tripId}`);
      setOpen(false);
    } catch (e) {
      console.error(e);
      window.location.href = `/trips/${tripId}`;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TRIP_INVITE': return '👥';
      case 'TRIP_REMINDER': return '🎒';
      case 'ACTIVITY_REMINDER': return '⏰';
      case 'BOOKING_REMINDER': return '✈️';
      default: return '🔔';
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-white font-medium">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-white/50 text-sm">You have no notifications.</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-4 border-b border-white/5 ${n.is_read ? 'opacity-60' : 'bg-white/5'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg select-none mt-0.5">{getIcon(n.type)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{n.title}</p>
                      <p className="text-sm text-white/70 mt-1">{n.content}</p>
                      
                      {!n.is_read && n.type === 'TRIP_INVITE' && (
                        <div className="mt-3 flex gap-2">
                          <button 
                            onClick={() => handleRespond(n.related_id, 'ACCEPT')}
                            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => handleRespond(n.related_id, 'REJECT')}
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      
                      {!n.is_read && n.type !== 'TRIP_INVITE' && (
                        <div className="mt-3 flex gap-2 items-center">
                          {n.related_id && (
                            <button 
                              onClick={() => handleViewTrip(n.id, n.related_id)}
                              className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                            >
                              View Trip
                            </button>
                          )}
                          <button 
                            onClick={() => handleRead(n.id)}
                            className="text-xs text-white/50 hover:text-white transition-colors"
                          >
                            Mark as read
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
