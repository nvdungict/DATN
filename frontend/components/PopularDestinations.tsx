'use client';
import Image from 'next/image';

export const POPULAR_DESTINATIONS_DATA = [
  {
    name: 'Da Lat',
    tagline: 'City of eternal spring & coffee',
    image: '/destinations/dalat.jpg',
    emoji: '🌸',
  },
  {
    name: 'Da Nang',
    tagline: 'Beaches, bridges & dragon fire',
    image: '/destinations/danang.jpg',
    emoji: '🐉',
  },
  {
    name: 'Hoi An',
    tagline: 'Lanterns, history & tailor shops',
    image: '/destinations/hoian.jpg',
    emoji: '🏮',
  },
  {
    name: 'Nha Trang',
    tagline: 'Blue waters & island escapes',
    image: '/destinations/nhatrang.jpg',
    emoji: '🏝️',
  },
  {
    name: 'Phu Quoc',
    tagline: 'Pearl island paradise',
    image: '/destinations/phuquoc.jpg',
    emoji: '💎',
  },
  {
    name: 'Tokyo',
    tagline: 'Where tradition meets the future',
    image: '/destinations/tokyo.jpg',
    emoji: '🗼',
  },
  {
    name: 'Singapore',
    tagline: 'The Garden City of Asia',
    image: '/destinations/singapore.jpg',
    emoji: '🌺',
  },
];

interface PopularDestinationsProps {
  onSelect: (name: string) => void;
}

export default function PopularDestinations({ onSelect }: PopularDestinationsProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white">🌏 Popular Destinations</h2>
        <span className="text-slate-500 text-sm">Click to plan instantly</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
        {POPULAR_DESTINATIONS_DATA.map(dest => (
          <button
            key={dest.name}
            onClick={() => onSelect(dest.name)}
            className="flex-shrink-0 snap-start group relative w-44 h-56 rounded-2xl overflow-hidden border border-white/10 hover:border-indigo-400/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/20"
          >
            {/* Image */}
            <Image
              src={dest.image}
              alt={dest.name}
              fill
              sizes="(max-width: 768px) 100vw, 200px"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
              <div className="text-xl mb-1">{dest.emoji}</div>
              <p className="text-white font-bold text-sm leading-tight">{dest.name}</p>
              <p className="text-slate-300 text-xs leading-snug mt-0.5">{dest.tagline}</p>
            </div>
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-colors duration-300 flex items-center justify-center">
              <span className="text-white text-xs font-semibold bg-indigo-600/80 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                Plan Now →
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
