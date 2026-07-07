'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ItineraryItem } from '@/types';
import { formatCurrency } from '@/lib/currency';

type MapPoint = ItineraryItem & {
  activity_details: ItineraryItem['activity_details'] & { lat: number; lng: number };
  coordinateQuality: 'exact' | 'estimated';
  displayLat: number;
  displayLng: number;
};

const dayColors = ['#818cf8', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#a78bfa', '#f97316'];

const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
  ATTRACTION: { label: 'Attraction', color: '#a78bfa', icon: 'A' },
  MEAL: { label: 'Dining', color: '#f59e0b', icon: 'M' },
  TRANSPORT: { label: 'Transport', color: '#38bdf8', icon: 'T' },
  LODGING: { label: 'Lodging', color: '#34d399', icon: 'H' },
  OTHER: { label: 'Other', color: '#cbd5e1', icon: 'O' },
};

function isValidCoordinate(lat: unknown, lng: unknown) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return (
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180 &&
    !(latNum === 0 && lngNum === 0)
  );
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTimeRange(item: ItineraryItem) {
  if (!item.start_time && !item.end_time) return '';
  return `${item.start_time || ''}${item.end_time ? ` - ${item.end_time}` : ''}`;
}

function costLabel(item: ItineraryItem) {
  const details = item.activity_details as any;
  const value = details?.estimated_cost ?? details?.total_price ?? details?.price;
  if (value == null || Number(value) <= 0) return '';
  return formatCurrency(value, details?.currency);
}

function isLocalTransport(item: ItineraryItem) {
  const name = item.activity_details?.name?.toLowerCase() || '';
  return item.type === 'TRANSPORT' && (
    name.includes('local transportation') ||
    name.includes('taxi/grab') ||
    name.includes('chi phí đi lại') ||
    name.includes('đi lại nội địa')
  );
}

function shouldShowOnMap(item: ItineraryItem) {
  return item.type !== 'OTHER' && !isLocalTransport(item);
}

function offsetDuplicateMarkers(points: MapPoint[]) {
  const groups = new Map<string, MapPoint[]>();

  points.forEach((point) => {
    const key = `${point.activity_details.lat.toFixed(5)},${point.activity_details.lng.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) || []), point]);
  });

  groups.forEach((group) => {
    if (group.length === 1) {
      group[0].displayLat = group[0].activity_details.lat;
      group[0].displayLng = group[0].activity_details.lng;
      return;
    }

    const radius = 0.00022;
    group.forEach((point, index) => {
      const angle = (Math.PI * 2 * index) / group.length;
      point.displayLat = point.activity_details.lat + Math.sin(angle) * radius;
      point.displayLng = point.activity_details.lng + Math.cos(angle) * radius;
    });
  });

  return points;
}

function buildEstimatedPoints(items: ItineraryItem[]) {
  const mappableItems = items.filter(shouldShowOnMap);
  const exactPoints: MapPoint[] = [];
  const missingItems: ItineraryItem[] = [];

  mappableItems.forEach((item) => {
    const lat = item.activity_details?.lat;
    const lng = item.activity_details?.lng;
    if (isValidCoordinate(lat, lng)) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      exactPoints.push({
        ...item,
        activity_details: {
          ...item.activity_details,
          lat: latNum,
          lng: lngNum,
        },
        coordinateQuality: 'exact',
        displayLat: latNum,
        displayLng: lngNum,
      });
    } else {
      missingItems.push(item);
    }
  });

  const exactByDay = exactPoints.reduce<Record<number, MapPoint[]>>((acc, point) => {
    const day = point.day_number || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(point);
    return acc;
  }, {});

  const allExactCenter = exactPoints.length > 0
    ? {
        lat: exactPoints.reduce((sum, point) => sum + point.activity_details.lat, 0) / exactPoints.length,
        lng: exactPoints.reduce((sum, point) => sum + point.activity_details.lng, 0) / exactPoints.length,
      }
    : null;

  const estimatedPoints: MapPoint[] = [];

  missingItems.forEach((item) => {
    const day = item.day_number || 1;
    const dayExact = exactByDay[day] || [];
    const base = dayExact.length > 0
      ? {
          lat: dayExact.reduce((sum, point) => sum + point.activity_details.lat, 0) / dayExact.length,
          lng: dayExact.reduce((sum, point) => sum + point.activity_details.lng, 0) / dayExact.length,
        }
      : allExactCenter;

    if (!base) return;

    const index = estimatedPoints.filter((point) => (point.day_number || 1) === day).length;
    const angle = (Math.PI * 2 * index) / Math.max(missingItems.length, 4);
    const radius = 0.0012 + index * 0.00012;
    const lat = base.lat + Math.sin(angle) * radius;
    const lng = base.lng + Math.cos(angle) * radius;

    estimatedPoints.push({
      ...item,
      activity_details: {
        ...item.activity_details,
        lat,
        lng,
      },
      coordinateQuality: 'estimated',
      displayLat: lat,
      displayLng: lng,
    });
  });

  return {
    points: offsetDuplicateMarkers([...exactPoints, ...estimatedPoints]),
    exactCount: exactPoints.length,
    estimatedCount: estimatedPoints.length,
    unplacedCount: missingItems.length - estimatedPoints.length,
  };
}

export default function InteractiveMap({ items }: { items: ItineraryItem[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [activeDay, setActiveDay] = useState<number | 'all'>('all');

  const { points: mapItems, exactCount, estimatedCount, unplacedCount } = useMemo(
    () => buildEstimatedPoints(items),
    [items],
  );

  const days = useMemo(
    () => Array.from(new Set(mapItems.map((item) => item.day_number || 1))).sort((a, b) => a - b),
    [mapItems],
  );

  const visibleItems = useMemo(
    () => (activeDay === 'all' ? mapItems : mapItems.filter((item) => (item.day_number || 1) === activeDay)),
    [activeDay, mapItems],
  );

  useEffect(() => {
    if (activeDay !== 'all' && !days.includes(activeDay)) {
      setActiveDay('all');
    }
  }, [activeDay, days]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (cancelled || !mapRef.current) return;

      // Fix default icon paths for Next.js.
      // @ts-expect-error leaflet internals
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }

      const center = visibleItems.length > 0
        ? [visibleItems[0].activity_details.lat, visibleItems[0].activity_details.lng] as [number, number]
        : [21.028, 105.834] as [number, number];

      const map = L.map(mapRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
      }).setView(center, 13);
      mapInstanceRef.current = map;

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      const groupedByDay: Record<number, MapPoint[]> = {};
      visibleItems.forEach((item) => {
        const day = item.day_number || 1;
        if (!groupedByDay[day]) groupedByDay[day] = [];
        groupedByDay[day].push(item);
      });

      const allPositions: [number, number][] = [];

      Object.entries(groupedByDay)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([dayStr, dayItems]) => {
          const day = Number(dayStr);
          const routeColor = dayColors[(day - 1) % dayColors.length];
          const positions = dayItems.map((item) => [item.displayLat, item.displayLng] as [number, number]);
          allPositions.push(...positions);

          if (positions.length > 1) {
            L.polyline(positions, {
              color: routeColor,
              weight: 4,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(map);
          }

          dayItems.forEach((item, index) => {
            const details = item.activity_details;
            const config = typeConfig[item.type] || typeConfig.OTHER;
            const isStart = index === 0;
            const isEnd = index === dayItems.length - 1 && dayItems.length > 1;
            const markerLabel = isStart ? 'S' : isEnd ? 'E' : config.icon;
            const markerColor = item.coordinateQuality === 'estimated' ? '#fbbf24' : (isStart || isEnd ? routeColor : config.color);
            const time = formatTimeRange(item);
            const cost = costLabel(item);

            const icon = L.divIcon({
              html: `<div style="
                width:34px;height:34px;border-radius:999px;
                background:${markerColor}22;
                border:${item.coordinateQuality === 'estimated' ? '2px dashed' : '2px solid'} ${markerColor};
                box-shadow:0 10px 28px rgba(0,0,0,.35);
                color:white;font-size:12px;font-weight:800;
                display:flex;align-items:center;justify-content:center;
                font-family:Inter,ui-sans-serif,system-ui,sans-serif;
              ">${markerLabel}</div>`,
              className: '',
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            });

            L.marker([item.displayLat, item.displayLng], { icon })
              .addTo(map)
              .bindPopup(`
                <div style="font-family:Inter,ui-sans-serif,system-ui,sans-serif;min-width:220px;color:#0f172a">
                  <div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${routeColor};margin-bottom:6px">
                    Day ${day} ${time ? `&middot; ${escapeHtml(time)}` : ''}
                  </div>
                  <div style="font-size:15px;font-weight:800;line-height:1.35;margin-bottom:6px">${escapeHtml(details.name)}</div>
                  ${item.coordinateQuality === 'estimated' ? '<div style="display:inline-block;font-size:11px;font-weight:800;color:#92400e;background:#fef3c7;border:1px solid #f59e0b;border-radius:999px;padding:3px 8px;margin-bottom:8px">Estimated map position</div>' : ''}
                  <div style="font-size:12px;color:#475569;margin-bottom:8px">${escapeHtml(config.label)}${details.address ? ` &middot; ${escapeHtml(details.address)}` : ''}</div>
                  ${cost ? `<div style="font-size:13px;font-weight:800;color:#059669;margin-bottom:8px">${escapeHtml(cost)}</div>` : ''}
                  ${details.note ? `<div style="font-size:12px;color:#64748b;line-height:1.45;border-top:1px solid #e2e8f0;padding-top:8px">${escapeHtml(details.note)}</div>` : ''}
                </div>
              `);
          });
        });

      if (allPositions.length > 1) {
        map.fitBounds(L.latLngBounds(allPositions), { padding: [42, 42], maxZoom: 15 });
      } else if (allPositions.length === 1) {
        map.setView(allPositions[0], 14);
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [visibleItems]);

  if (mapItems.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500">
        <MapPlaceholderIcon />
        <p className="mt-3 text-sm font-medium text-slate-400">No valid locations to display</p>
        <p className="mt-1 text-xs">Add itinerary items with real latitude and longitude.</p>
        {unplacedCount > 0 && (
          <p className="mt-3 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
            {unplacedCount} location{unplacedCount > 1 ? 's' : ''} hidden due to invalid coordinates
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
      <div ref={mapRef} style={{ height: '560px', width: '100%' }} className="z-10" />

      <div className="absolute left-4 top-4 z-[400] max-w-[calc(100%-2rem)] rounded-xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveDay('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeDay === 'all' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/15'
            }`}
          >
            All days
          </button>
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeDay === day ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/15'
              }`}
            >
              Day {day}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {days.map((day) => {
            const count = mapItems.filter((item) => (item.day_number || 1) === day).length;
            const estimatedForDay = mapItems.filter((item) => (item.day_number || 1) === day && item.coordinateQuality === 'estimated').length;
            return (
              <div key={day} className="flex items-center gap-2 text-xs text-slate-300">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: dayColors[(day - 1) % dayColors.length] }}
                />
                <span>Day {day}</span>
                <span className="text-slate-500">({count})</span>
                {estimatedForDay > 0 && <span className="text-amber-300">+{estimatedForDay} estimated</span>}
              </div>
            );
          })}
        </div>
      </div>

      {(estimatedCount > 0 || unplacedCount > 0) && (
        <div className="absolute bottom-4 left-4 z-[400] rounded-full border border-amber-500/20 bg-slate-950/90 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-xl backdrop-blur-xl">
          {estimatedCount > 0 && `${estimatedCount} estimated`}
          {estimatedCount > 0 && unplacedCount > 0 && ' · '}
          {unplacedCount > 0 && `${unplacedCount} hidden`}
        </div>
      )}

      <div className="absolute bottom-4 right-16 z-[400] hidden rounded-full border border-white/10 bg-slate-950/90 px-3 py-1.5 text-xs text-slate-300 shadow-xl backdrop-blur-xl sm:block">
        {exactCount} exact points · S = start, E = end
      </div>
    </div>
  );
}

function MapPlaceholderIcon() {
  return (
    <svg className="h-10 w-10 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v15M15 6v15" />
    </svg>
  );
}
