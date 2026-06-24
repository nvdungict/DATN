'use client';
import { useState } from 'react';

const POPULAR_DESTINATIONS = [
  'Da Lat', 'Da Nang', 'Hoi An', 'Nha Trang', 'Phu Quoc', 'Tokyo', 'Singapore',
  'Hanoi', 'Ho Chi Minh City', 'Bali', 'Bangkok', 'Seoul', 'Paris',
];

const INTERESTS = [
  { label: 'Nature', icon: '🌿' },
  { label: 'Food', icon: '🍜' },
  { label: 'Coffee', icon: '☕' },
  { label: 'Photography', icon: '📸' },
  { label: 'Adventure', icon: '🧗' },
  { label: 'Culture', icon: '🏛️' },
  { label: 'Beach', icon: '🏖️' },
  { label: 'Shopping', icon: '🛍️' },
  { label: 'Nightlife', icon: '🌃' },
  { label: 'Relaxation', icon: '🧘' },
  { label: 'Hiking', icon: '🥾' },
  { label: 'Local Experience', icon: '🤝' },
];

const BUDGET_OPTIONS = ['Economy', 'Standard', 'Premium', 'Luxury'];
const TRAVELER_OPTIONS = ['Solo', 'Couple', 'Family', 'Friends'];
const PACE_OPTIONS = ['Relaxed', 'Balanced', 'Packed'];

interface GuidedPlannerProps {
  onGenerate: (prompt: string) => Promise<void>;
  generating: boolean;
  prefillDestination?: string;
}

export default function GuidedPlanner({ onGenerate, generating, prefillDestination }: GuidedPlannerProps) {
  const [destination, setDestination] = useState(prefillDestination || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('Standard');
  const [customBudget, setCustomBudget] = useState('');
  const [travelers, setTravelers] = useState('Solo');
  const [interests, setInterests] = useState<string[]>([]);
  const [pace, setPace] = useState('Balanced');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const filteredSuggestions = destination.length >= 1
    ? POPULAR_DESTINATIONS.filter(d => d.toLowerCase().includes(destination.toLowerCase()))
    : [];

  function toggleInterest(label: string) {
    setInterests(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  }

  function getDays(): number {
    if (!startDate || !endDate) return 3;
    const diff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }

  function buildPrompt(): string {
    const days = getDays();
    const budgetStr = customBudget ? `${budget} (custom: ${customBudget})` : budget;
    const interestStr = interests.length > 0 ? interests.join(', ') : 'general sightseeing';
    const dateStr = startDate && endDate
      ? `from ${startDate} to ${endDate}`
      : `for ${days} days`;

    return `Create a detailed ${days}-day itinerary for a ${travelers.toLowerCase()} visiting ${destination} ${dateStr}.
Budget level: ${budgetStr}.
Interests include: ${interestStr}.
Travel pace should be: ${pace}.
Include:
- Daily activities and attractions
- Restaurant recommendations
- Accommodation suggestions
- Transportation recommendations
- Estimated costs per activity${notes ? `\nAdditional notes: ${notes}` : ''}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!destination.trim()) { setError('Please enter a destination.'); return; }
    if (!startDate || !endDate) { setError('Please select travel dates.'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError('End date must be after start date.'); return; }
    await onGenerate(buildPrompt());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Destination */}
      <div className="relative">
        <label className="block text-slate-300 text-sm font-medium mb-2">
          📍 Destination <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={destination}
          onChange={e => { setDestination(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Where do you want to go?"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl">
            {filteredSuggestions.slice(0, 6).map(d => (
              <button
                key={d}
                type="button"
                onMouseDown={() => { setDestination(d); setShowSuggestions(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-indigo-600/30 hover:text-white transition"
              >
                📍 {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Travel Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">
            📅 Start Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">
            📅 End Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            min={startDate || new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="block text-slate-300 text-sm font-medium mb-2">💰 Budget Level</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {BUDGET_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setBudget(opt)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                budget === opt
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:border-indigo-500/50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={customBudget}
          onChange={e => setCustomBudget(e.target.value)}
          placeholder="Custom amount (e.g. 10.000.000 VND) — optional"
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
        />
      </div>

      {/* Travelers */}
      <div>
        <label className="block text-slate-300 text-sm font-medium mb-2">👥 Travelers</label>
        <div className="flex flex-wrap gap-2">
          {TRAVELER_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setTravelers(opt)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                travelers === opt
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:border-violet-500/50'
              }`}
            >
              {opt === 'Solo' ? '🧳' : opt === 'Couple' ? '💑' : opt === 'Family' ? '👨‍👩‍👧' : '👫'} {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Travel Interests */}
      <div>
        <label className="block text-slate-300 text-sm font-medium mb-2">
          ✨ Travel Interests <span className="text-slate-500 font-normal">(choose multiple)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(({ label, icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleInterest(label)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                interests.includes(label)
                  ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-emerald-500/40 hover:text-slate-200'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Travel Pace */}
      <div>
        <label className="block text-slate-300 text-sm font-medium mb-2">⚡ Travel Pace</label>
        <div className="flex gap-2">
          {PACE_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setPace(opt)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                pace === opt
                  ? 'bg-sky-600 border-sky-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:border-sky-500/50'
              }`}
            >
              {opt === 'Relaxed' ? '🌊' : opt === 'Balanced' ? '⚖️' : '🚀'} {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-slate-300 text-sm font-medium mb-2">
          📝 Additional Notes <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Dietary restrictions, accessibility needs, special occasions..."
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={generating}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-base disabled:opacity-50 transition-all duration-200 shadow-lg shadow-indigo-500/25"
      >
        {generating ? '✨ AI is planning your trip...' : '🚀 Generate My Trip'}
      </button>

      {getDays() > 0 && destination && (
        <p className="text-center text-slate-500 text-xs">
          {getDays()}-day trip to {destination} · {travelers} · {pace} pace
        </p>
      )}
    </form>
  );
}
