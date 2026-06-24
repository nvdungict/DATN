'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard?tab=ai', label: 'AI Planner' },
  { href: '/dashboard?tab=guided', label: 'Guided Planner' },
  { href: '/explore', label: 'Explore' },
  { href: '/tours', label: 'Tours' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/budget', label: 'Budget' },
  { href: '/settings', label: 'Settings' },
];

interface SidebarProps {
  recentTrips?: { id: number; title: string; destination: string }[];
  onDeleteTrip?: (id: number) => void;
}

export default function Sidebar({ recentTrips = [], onDeleteTrip }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href.split('?')[0]) && href !== '/dashboard';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo & Notifications */}
      <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/30">
            ✈️
          </div>
          <span className="text-white font-bold text-lg group-hover:text-indigo-300 transition">TravelAI</span>
        </Link>
        <NotificationBell />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-slate-600 text-xs uppercase tracking-widest px-3 mb-3 font-medium">Navigation</p>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive(item.href)
                ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{item.label}</span>
            {isActive(item.href) && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
            )}
          </Link>
        ))}

        {/* Recent trips */}
        {recentTrips.length > 0 && (
          <div className="pt-4">
            <p className="text-slate-600 text-xs uppercase tracking-widest px-3 mb-3 font-medium">Recent Trips</p>
            {recentTrips.map(trip => (
              <div key={trip.id} className={`relative group/trip ${openDropdown === trip.id ? 'z-50' : 'z-0'}`}>
                <Link
                  href={`/trips/${trip.id}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition text-sm pr-10"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-300">{trip.title}</p>
                    <p className="text-xs text-slate-600 truncate">📍 {trip.destination}</p>
                  </div>
                </Link>

                {onDeleteTrip && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpenDropdown(openDropdown === trip.id ? null : trip.id); }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 opacity-0 group-hover/trip:opacity-100 transition focus:opacity-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openDropdown === trip.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenDropdown(null); }} 
                        />
                        <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setOpenDropdown(null);
                              onDeleteTrip(trip.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition relative z-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-500 text-xs">AI Online</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-slate-950/60 backdrop-blur-xl border-r border-white/8 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-xl bg-slate-900/90 border border-white/10 text-white flex items-center justify-center backdrop-blur-xl"
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-slate-950 border-r border-white/10 h-full">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <span className="text-white font-bold text-lg">TravelAI</span>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white text-xl">
                ×
              </button>
            </div>
            <SidebarContent />
          </div>
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}
    </>
  );
}
