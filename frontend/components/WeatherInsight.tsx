import { AlertTriangle, CloudSun, Droplets, Gauge, Thermometer, Wind } from 'lucide-react';
import type { TripWeather, WeatherDay } from '@/types';

interface WeatherInsightProps {
  weather: TripWeather | null;
  loading?: boolean;
}

function weatherIconUrl(icon?: string) {
  if (!icon) return null;
  return icon.startsWith('//') ? `https:${icon}` : icon;
}

function formatTemp(value?: number) {
  if (value === undefined || value === null) return '--';
  return `${Math.round(value)}°C`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

function formatDateRange(start?: string, end?: string) {
  if (!start || !end) return null;
  if (start === end) return formatDate(start);
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function DayPill({ day }: { day: WeatherDay }) {
  const icon = weatherIconUrl(day.icon);

  return (
    <div className="min-w-[132px] rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{formatDate(day.date)}</p>
        {icon ? (
          <img src={icon} alt="" className="h-8 w-8" />
        ) : (
          <CloudSun className="h-5 w-5 text-sky-300" />
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-semibold text-white" title={day.condition}>{day.condition}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{formatTemp(day.min_temp_c)} - {formatTemp(day.max_temp_c)}</span>
        <span className="inline-flex items-center gap-1 text-sky-300">
          <Droplets className="h-3.5 w-3.5" />
          {day.chance_of_rain ?? 0}%
        </span>
      </div>
    </div>
  );
}

export default function WeatherInsight({ weather, loading = false }: WeatherInsightProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
        <div className="mb-4 flex items-center gap-2">
          <CloudSun className="h-4 w-4 text-sky-300" />
          <h3 className="text-sm font-semibold text-white">Weather Insight</h3>
        </div>
        <div className="h-20 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (!weather) return null;

  if (!weather.configured) {
    return (
      <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          <h3 className="text-sm font-semibold text-white">Weather Insight</h3>
        </div>
        <p className="text-sm text-slate-300">
          WeatherAPI key is ready in the backend env. Add your key to <span className="font-mono text-amber-200">WEATHERAPI_KEY</span> to enable live forecast.
        </p>
      </div>
    );
  }

  const currentIcon = weatherIconUrl(weather.current?.icon ?? weather.days?.[0]?.icon);
  const firstAdvice = weather.advice?.[0];
  const firstDay = weather.days?.[0];
  const headlineTemp = weather.current?.temp_c ?? firstDay?.avg_temp_c;
  const headlineCondition = weather.current?.condition ?? firstDay?.condition ?? 'Trip forecast';
  const forecastRange = formatDateRange(weather.forecast_start_date, weather.forecast_end_date);
  const requestedRange = formatDateRange(weather.requested_start_date, weather.requested_end_date);

  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-sky-300" />
            <h3 className="text-sm font-semibold text-white">Trip Forecast</h3>
          </div>
          <p className="text-xs text-slate-500">
            {weather.location || 'Trip location'}{forecastRange ? ` · ${forecastRange}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 text-right">
          {currentIcon ? <img src={currentIcon} alt="" className="h-10 w-10" /> : null}
          <div>
            <p className="text-2xl font-bold text-white">{formatTemp(headlineTemp)}</p>
            <p className="text-xs text-slate-400">{headlineCondition}</p>
          </div>
        </div>
      </div>

      {weather.unavailable ? (
        <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
          {weather.advice?.[0] || 'Weather data is temporarily unavailable.'}
          {requestedRange ? <span className="mt-1 block text-xs text-amber-100/70">Trip dates: {requestedRange}</span> : null}
        </div>
      ) : (
        <>
          {weather.current?.temp_c !== undefined && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Thermometer className="h-3.5 w-3.5" />
                  Feels Like
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{formatTemp(weather.current?.feelslike_c)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Droplets className="h-3.5 w-3.5" />
                  Humidity
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{weather.current?.humidity ?? '--'}%</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Wind className="h-3.5 w-3.5" />
                  Wind
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{weather.current?.wind_kph ?? '--'} km/h</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Gauge className="h-3.5 w-3.5" />
                  AQI
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{weather.current?.air_quality?.us_epa_index ?? '--'}</p>
              </div>
            </div>
          )}

          {weather.coverage_note && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              weather.partial
                ? 'border-amber-400/20 bg-amber-400/5 text-amber-100'
                : 'border-emerald-400/15 bg-emerald-400/5 text-emerald-100'
            }`}>
              {weather.coverage_note}
            </div>
          )}

          {firstAdvice && (
            <div className="mt-4 rounded-xl border border-sky-400/15 bg-sky-400/5 px-4 py-3 text-sm text-sky-100">
              {firstAdvice}
            </div>
          )}

          {weather.alerts?.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
              <span className="font-semibold">{weather.alerts[0].event || 'Weather alert'}:</span> {weather.alerts[0].headline || 'Review weather warnings before outdoor plans.'}
            </div>
          )}

          {weather.days?.length > 0 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {weather.days.slice(0, 7).map((day) => (
                <DayPill key={day.date} day={day} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
