'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import { POPULAR_DESTINATIONS_DATA } from '@/components/PopularDestinations';

const EXPLORE_SECTIONS = [
  {
    title: '🏔️ Mountain Adventures',
    destinations: [
      { name: 'Da Lat', tagline: 'Coffee, flowers & waterfalls', image: '/destinations/dalat.jpg' },
      { name: 'Sapa', tagline: 'Rice terraces & tribal culture', image: '/destinations/sapa.jpg' },
      { name: 'Ha Giang', tagline: "Vietnam's last wild frontier", image: '/destinations/hagiang.jpg' },
    ],
  },
  {
    title: '🏖️ Beach Escapes',
    destinations: [
      { name: 'Phu Quoc', tagline: 'Pearl island crystal waters', image: '/destinations/phuquoc.jpg' },
      { name: 'Nha Trang', tagline: 'Diving paradise of Vietnam', image: '/destinations/nhatrang.jpg' },
      { name: 'Da Nang', tagline: 'Dragon city & white beaches', image: '/destinations/danang.jpg' },
    ],
  },
  {
    title: '🍜 Food Experiences',
    destinations: [
      { name: 'Hoi An', tagline: 'Banh mi, cao lau & lanterns', image: '/destinations/hoian.jpg' },
      { name: 'Hanoi', tagline: "Pho, bun cha & egg coffee", image: '/destinations/hanoi.jpg' },
      { name: 'Bangkok', tagline: 'Street food capital of Asia', image: '/destinations/bangkok.jpg' },
    ],
  },
  {
    title: '🌃 Weekend Getaways',
    destinations: [
      { name: 'Singapore', tagline: '2-night luxury city break', image: '/destinations/singapore.jpg' },
      { name: 'Vung Tau', tagline: 'Easy beach escape from HCMC', image: '/destinations/vungtau.JPG' },
      { name: 'Da Lat', tagline: 'Cool air & French villas', image: '/destinations/dalat.jpg' },
    ],
  },
];

export default function ExplorePage() {
  const router = useRouter();

  function goToDashboardWithDest(dest: string) {
    router.push(`/dashboard?tab=guided&dest=${encodeURIComponent(dest)}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 flex">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🌏 Explore Destinations</h1>
            <p className="text-slate-400">Discover your next adventure. Click any destination to start planning.</p>
          </div>

          {/* Popular Destinations */}
          <section>
            <h2 className="text-xl font-bold text-white mb-5">⭐ Popular Destinations</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {POPULAR_DESTINATIONS_DATA.map(dest => (
                <button
                  key={dest.name}
                  onClick={() => goToDashboardWithDest(dest.name)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10 text-left"
                >
                  <div className="relative h-44">
                    <Image src={dest.image} alt={dest.name} fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-bold text-sm">{dest.emoji} {dest.name}</p>
                      <p className="text-slate-300 text-xs mt-0.5">{dest.tagline}</p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold bg-indigo-600/80 px-3 py-1 rounded-full transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        Plan This Trip →
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Section grids */}
          {EXPLORE_SECTIONS.map(section => (
            <section key={section.title}>
              <h2 className="text-xl font-bold text-white mb-5">{section.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {section.destinations.map(dest => (
                  <button
                    key={dest.name}
                    onClick={() => goToDashboardWithDest(dest.name)}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10 text-left"
                  >
                    <div className="relative h-48">
                      <Image src={dest.image} alt={dest.name} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 p-4">
                        <p className="text-white font-bold">{dest.name}</p>
                        <p className="text-slate-300 text-sm">{dest.tagline}</p>
                      </div>
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-xs bg-indigo-600/80 text-white px-2.5 py-1 rounded-full font-semibold">Plan →</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}

        </div>
      </div>
    </div>
  );
}
