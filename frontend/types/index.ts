// Core domain types matching backend schemas

export interface User {
  id: number;
  email: string;
  travel_profile: Record<string, unknown>;
  created_at: string;
  is_active: boolean;
}

export type TripStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface Trip {
  id: number;
  user_id: number;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: TripStatus;
  total_budget: number;
  currency: string;
  created_at: string;
  updated_at: string;
  user_role?: string;
}

export type ItemType = 'ATTRACTION' | 'MEAL' | 'TRANSPORT' | 'LODGING' | 'OTHER';
export type ItemStatus = 'SUGGESTED' | 'CONFIRMED' | 'COMPLETED';

export interface ActivityDetails {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  note?: string;
  estimated_cost?: number;
  currency?: string;
  booking_link?: string;
  airline?: string;
  flight_number?: string;
  departure_airport?: string;
  arrival_airport?: string;
  departure_time?: string;
  arrival_time?: string;
  price?: number;
  stars?: number;
  rating?: number;
  total_price?: number;
  price_per_night?: number;
}

export interface ItineraryItem {
  id: number;
  trip_id: number;
  day_number: number;
  start_time: string | null;
  end_time: string | null;
  type: ItemType;
  activity_details: ActivityDetails;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
}

export interface WeatherDay {
  date: string;
  condition: string;
  icon?: string;
  code?: number;
  max_temp_c?: number;
  min_temp_c?: number;
  avg_temp_c?: number;
  chance_of_rain?: number;
  total_precip_mm?: number;
  max_wind_kph?: number;
  uv?: number;
}

export interface WeatherAlert {
  headline?: string;
  severity?: string;
  event?: string;
  effective?: string;
  expires?: string;
  desc?: string;
}

export interface TripWeather {
  configured: boolean;
  unavailable?: boolean;
  mode?: 'forecast' | 'future' | 'unavailable';
  requested_start_date?: string;
  requested_end_date?: string;
  forecast_start_date?: string;
  forecast_end_date?: string;
  partial?: boolean;
  coverage_note?: string;
  location: string;
  local_time?: string;
  current?: {
    temp_c?: number;
    feelslike_c?: number;
    condition?: string;
    icon?: string;
    humidity?: number;
    wind_kph?: number;
    uv?: number;
    air_quality?: {
      pm2_5?: number;
      us_epa_index?: number;
    };
  };
  days: WeatherDay[];
  alerts: WeatherAlert[];
  advice: string[];
}

export interface MemoryStream {
  id: number;
  user_id: number;
  trip_id: number | null;
  content: string;
  memory_type: string;
  created_at: string;
}

// WebSocket message types
export type WSMessageType = 'token' | 'final' | 'error';

export interface WSMessage {
  type: WSMessageType;
  content: string;
  metadata?: {
    node?: string;
    action?: string;
    trip?: Partial<Trip>;
    itinerary_items?: Partial<ItineraryItem>[];
    conflicts?: Conflict[];
  };
}

export interface Conflict {
  type: 'TIME_OVERLAP' | 'BUDGET_EXCEEDED';
  message: string;
  day?: number;
  item_a?: string;
  item_b?: string;
}

export interface AgentResponse {
  action: 'CREATE_TRIP' | 'MODIFY_TRIP' | 'ASK_INFO' | 'SUGGEST';
  trip?: Partial<Trip>;
  itinerary_items?: Partial<ItineraryItem>[];
  conflicts?: Conflict[];
  messages?: { role: string; content: string }[];
}
