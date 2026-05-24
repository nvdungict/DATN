from typing import TypedDict, Any, Optional


class AgentState(TypedDict):
    # Input
    user_message: str
    user_id: int
    trip_id: Optional[int]

    # Extracted by Understand node
    intent: str  # "CREATE_TRIP" | "MODIFY_TRIP" | "ASK_INFO"
    entities: dict  # location, dates, budget, num_days, etc.

    # Retrieved data
    existing_trip: Optional[dict]
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
