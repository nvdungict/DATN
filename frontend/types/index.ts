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
}

export type ItemType = 'ATTRACTION' | 'MEAL' | 'TRANSPORT' | 'LODGING';
export type ItemStatus = 'SUGGESTED' | 'CONFIRMED' | 'COMPLETED';

export interface ActivityDetails {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  note?: string;
  estimated_cost?: number;
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
