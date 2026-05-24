'use client';
import { useEffect, useRef } from 'react';
import type { ItineraryItem } from '@/types';

// Leaflet is client-side only — dynamically loaded
export default function InteractiveMap({ items }: { items: ItineraryItem[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  const mapItems = items.filter(
    (i) => i.activity_details.lat != null && i.activity_details.lng != null
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Fix default icon paths for Next.js
      // @ts-expect-error leaflet internals
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapRef.current) return;

      // Destroy previous instance
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }

      const center = mapItems.length > 0
        ? [mapItems[0].activity_details.lat!, mapItems[0].activity_details.lng!] as [number, number]
        : [21.028, 105.834] as [number, number]; // Hanoi default

      const map = L.map(mapRef.current).setView(center, 13);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Color icons per type
      const typeColors: Record<string, string> = {
        ATTRACTION: '#818cf8',
        MEAL: '#f59e0b',
        TRANSPORT: '#38bdf8',
        LODGING: '#34d399',
      };

      const markerPositions: [number, number][] = [];

      mapItems.forEach((item) => {
        const lat = item.activity_details.lat!;
        const lng = item.activity_details.lng!;
        markerPositions.push([lat, lng]);

        const color = typeColors[item.type] || '#ffffff';
        const icon = L.divIcon({
          html: `<div style="
            width:32px;height:32px;border-radius:50%;
            background:${color}22;
            border:2px solid ${color};
            display:flex;align-items:center;justify-content:center;
            font-size:14px;color:white;
          ">
            ${{ ATTRACTION: '🏛', MEAL: '🍽', TRANSPORT: '🚌', LODGING: '🏨' }[item.type] || '📍'}
          </div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:180px">
              <strong style="font-size:14px">${item.activity_details.name}</strong><br/>
              <small style="color:#666">${item.activity_details.address || ''}</small>
              ${item.activity_details.estimated_cost != null ? `<br/><span style="color:#4f46e5">$${item.activity_details.estimated_cost}</span>` : ''}
              ${item.activity_details.note ? `<br/><em style="font-size:12px">${item.activity_details.note}</em>` : ''}
            </div>
          `);
      });

      // Draw route polyline
      if (markerPositions.length > 1) {
        L.polyline(markerPositions, {
          color: '#6366f1',
          weight: 2,
          dashArray: '5,8',
          opacity: 0.7,
        }).addTo(map);

        // Fit bounds
        map.fitBounds(L.latLngBounds(markerPositions), { padding: [30, 30] });
      }
    })();

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [items]);

  if (mapItems.length === 0) {
    return (
      <div className="h-96 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-slate-500">
        <span className="text-4xl mb-3">🗺️</span>
        <p>No locations to display on map</p>
        <p className="text-sm mt-1">Add itinerary items with coordinates</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <div
        ref={mapRef}
        style={{ height: '500px', width: '100%' }}
        className="z-10"
      />
    </div>
  );
}
