from typing import TypedDict, Any, Optional


class AgentState(TypedDict):
    # Input
    user_message: str
    user_id: int
    trip_id: Optional[int]

    # Extracted by Understand node
    intent: str  # "CREATE_TRIP" | "MODIFY_TRIP" | "ASK_INFO" | "SEARCH_FLIGHT" | "SEARCH_HOTEL"
    entities: dict  # location, dates, budget, num_days, origin_airport, destination_airport, etc.

    # Retrieved data
    existing_trip: Optional[dict]
    user_profile: Optional[dict]
    memory_context: list[str]
    search_results: list[dict]

    # Generated plan
    trip_data: Optional[dict]
    itinerary_items: list[dict]

    # Constraint checking
    conflicts: list[dict]

    # Final output messages
    messages: list[dict]

    # Internal route signal
    next_node: str

    # Multi-agent routing
    agent_type: str  # "planning" | "info" | "booking"

    # Booking agent fields
    booking_params: dict   # {origin, destination, departure_date, city_code, checkin, checkout, adults}
    booking_results: list  # [{id, airline, flight_number, price, ...}]
    
    # Proactive GDS Synchronization
    gds_offers: dict # {"flights": [], "hotels": []}

    # Weather-aware planning
    weather_context: dict
