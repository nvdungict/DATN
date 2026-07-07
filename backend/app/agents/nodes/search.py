from app.agents.state import AgentState
from app.agents.tools import get_search_tool


def _extract_trip_context(state: AgentState) -> dict:
    """Extract useful location context from existing trip + itinerary."""
    context = {}

    existing_trip = state.get("existing_trip")
    if existing_trip:
        context["destination"] = existing_trip.get("destination", "")

    # Look for lodging items to find hotel name/address
    items = state.get("itinerary_items") or []
    lodging_names = []
    for item in items:
        if not item:
            continue
        if item.get("type") == "LODGING":
            details = item.get("activity_details", {})
            name = details.get("name", "")
            address = details.get("address", "")
            if name:
                lodging_names.append(name)
            elif address:
                lodging_names.append(address)
    if lodging_names:
        context["hotel"] = lodging_names[0]  # Dùng khách sạn đầu tiên tìm thấy

    return context


async def search_node(state: AgentState) -> AgentState:
    """Use external search (Tavily) to find place information."""
    entities = state.get("entities") or {}
    location = entities.get("location", "")
    intent = state.get("intent") or ""
    user_message = state["user_message"]

    # Get trip context (destination + hotel) if available from retrieve_node
    trip_ctx = _extract_trip_context(state)
    destination = location or trip_ctx.get("destination", "")
    hotel = trip_ctx.get("hotel", "")

    tool = get_search_tool()
    queries = []

    if intent == "ASK_INFO":
        # Build a richer, context-aware query using trip context
        if hotel and destination:
            # e.g. "quán mỳ quảng gần Mường Thanh Đà Nẵng"
            queries.append(f"{user_message[:150]} near {hotel} {destination}")
            queries.append(f"{user_message[:100]} in {destination}")
        elif hotel:
            queries.append(f"{user_message[:150]} near {hotel}")
            queries.append(user_message[:200])
        elif destination:
            queries.append(f"{user_message[:150]} in {destination}")
            queries.append(user_message[:200])
        else:
            queries.append(user_message[:200])
    elif destination:
        # CREATE_TRIP / MODIFY_TRIP: tìm attractions + nhà hàng theo địa điểm
        queries.append(f"top tourist attractions things to do in {destination}")
        queries.append(f"best restaurants food in {destination}")
    else:
        queries.append(user_message[:200])

    all_results = []
    for q in queries:
        try:
            results = await tool.search(q)
            all_results.extend(results)
        except Exception as e:
            all_results.append(
                {
                    "type": "placeholder",
                    "message": f"Không tìm thấy thông tin ({str(e)})",
                    "query": q,
                }
            )

    state["search_results"] = all_results[:10]

    # Proactive GDS Synchronization
    if intent in ("CREATE_TRIP", "MODIFY_TRIP") and destination:
        try:
            from app.services.travelport_service import TravelportClient
            from app.services.booking_com_service import BookingComClient
            from datetime import date, timedelta
            
            travelport = TravelportClient()
            booking_com = BookingComClient()
            
            # For demo, use generic origin HAN and start date next week
            start_date_str = entities.get("start_date") or str(date.today() + timedelta(days=7))
            end_date_str = entities.get("end_date") or str(date.today() + timedelta(days=10))
            
            def get_airport(loc):
                loc = (loc or "").lower()
                if "hà nội" in loc or "hanoi" in loc: return "HAN"
                if "hồ chí minh" in loc or "ho chi minh" in loc or "sài gòn" in loc or "saigon" in loc: return "SGN"
                if "đà nẵng" in loc or "da nang" in loc: return "DAD"
                if "nha trang" in loc: return "CXR"
                if "phú quốc" in loc or "phu quoc" in loc: return "PQC"
                if "đà lạt" in loc or "da lat" in loc: return "DLI"
                if "huế" in loc or "hue" in loc: return "HUI"
                if "hải phòng" in loc or "hai phong" in loc: return "HPH"
                return None
                
            origin = entities.get("origin_airport")
            if not origin:
                # Try to extract from user message
                if "hà nội" in user_message.lower() and ("từ" in user_message.lower() or "xuất phát" in user_message.lower()): origin = "HAN"
                elif "sài gòn" in user_message.lower() or "hồ chí minh" in user_message.lower(): origin = "SGN"
                else: origin = "HAN" # Fallback default
                
            dest_airport = get_airport(destination)
            
            flight_offers = []
            # Only search flights if destination has an airport and it's different from origin
            if dest_airport and origin != dest_airport:
                flight_offers = await travelport.search_flights(origin, dest_airport, start_date_str, 1)
            
            # Fetch hotels from Booking.com (RapidAPI)
            hotel_offers = await booking_com.search_hotels(destination, start_date_str, end_date_str, 1)
            
            state["gds_offers"] = {
                "flights": flight_offers,
                "hotels": hotel_offers
            }
        except Exception as e:
            # Fallback if something fails
            state["gds_offers"] = {"flights": [], "hotels": []}

    return state
