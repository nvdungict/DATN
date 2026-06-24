'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FloatingCopilot() {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Expanded panel */}
      {expanded && (
        <div className="w-72 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border-b border-white/10 flex items-center gap-2">
            <span className="text-lg">✨</span>
            <div>
              <p className="text-white font-semibold text-sm">Your Travel Copilot</p>
              <p className="text-slate-400 text-xs">AI-powered trip planning assistant</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="p-3 space-y-2">
            <p className="text-slate-500 text-xs uppercase tracking-wider px-1 mb-2">Quick Actions</p>

            {[
              { icon: '🗺️', label: 'Plan a new trip', action: () => { setExpanded(false); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
              { icon: '💬', label: 'Open AI chat on current trip', action: () => { setExpanded(false); } },
              { icon: '🌏', label: 'Explore destinations', action: () => { setExpanded(false); router.push('/explore'); } },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition text-sm text-left"
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Suggestion */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600/10 to-violet-600/10 border-t border-white/5">
            <p className="text-slate-400 text-xs">
              💡 <span className="text-slate-300">Tip:</span> Try saying "Plan a relaxing weekend in Hoi An for 2 people" in the AI Planner
            </p>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm shadow-2xl transition-all duration-300 ${
          expanded
            ? 'bg-indigo-600 text-white shadow-indigo-500/40 scale-95'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105'
        }`}
      >
        <span className={`transition-transform duration-300 ${expanded ? 'rotate-45' : ''}`}>✨</span>
        <span>Travel Copilot</span>
      </button>
    </div>
  );
}
