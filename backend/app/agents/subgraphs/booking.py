"""Booking Agent subgraph — handles SEARCH_FLIGHT and SEARCH_HOTEL intents.

Currently uses mock data while external API keys are pending.
When API keys are available, replace _search_flights() and _search_hotels()
with real API calls (SerpAPI Google Flights / Amadeus Hotel Search).
"""
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from app.agents.state import AgentState
from app.agents.timing import timed_node
from app.core.config import get_settings

settings = get_settings()
llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)

# ---------------------------------------------------------------------------
# Mock data — replace with real API calls when keys are available
# ---------------------------------------------------------------------------

MOCK_FLIGHTS = [
    {
        "id": "vj_001",
        "airline": "VietJet Air",
        "airline_code": "VJ",
        "flight_number": "VJ123",
        "departure_airport": "HAN",
        "arrival_airport": "DAN",
        "departure_time": "06:00",
        "arrival_time": "07:25",
        "duration": "1h25m",
        "stops": 0,
        "price": 980000,
        "currency": "VND",
        "cabin_class": "ECONOMY",
        "deep_link": "https://www.vietjetair.com",
    },
    {
        "id": "vn_002",
        "airline": "Vietnam Airlines",
        "airline_code": "VN",
        "flight_number": "VN211",
        "departure_airport": "HAN",
        "arrival_airport": "DAD",
        "departure_time": "08:30",
        "arrival_time": "09:55",
        "duration": "1h25m",
        "stops": 0,
        "price": 1350000,
        "currency": "VND",
        "cabin_class": "ECONOMY",
        "deep_link": "https://www.vietnamairlines.com",
    },
    {
        "id": "qh_003",
        "airline": "Bamboo Airways",
        "airline_code": "QH",
        "flight_number": "QH201",
        "departure_airport": "HAN",
        "arrival_airport": "DAD",
        "departure_time": "11:15",
        "arrival_time": "12:40",
        "duration": "1h25m",
        "stops": 0,
        "price": 1150000,
        "currency": "VND",
        "cabin_class": "ECONOMY",
        "deep_link": "https://www.bambooairways.com",
    },
]

MOCK_HOTELS = [
    {
        "id": "hotel_001",
        "name": "Mường Thanh Luxury Đà Nẵng",
        "address": "60 Bạch Đằng, Hải Châu, Đà Nẵng",
        "stars": 5,
        "rating": 8.7,
        "price_per_night": 1500000,
        "total_price": 4500000,
        "currency": "VND",
        "amenities": ["WiFi", "Pool", "Gym", "Restaurant"],
        "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
        "deep_link": "https://www.booking.com",
    },
    {
        "id": "hotel_002",
        "name": "Novotel Đà Nẵng Premier Han River",
        "address": "36 Bạch Đằng, Hải Châu, Đà Nẵng",
        "stars": 5,
        "rating": 8.9,
        "price_per_night": 2200000,
        "total_price": 6600000,
        "currency": "VND",
        "amenities": ["WiFi", "Pool", "Spa", "Bar", "River View"],
        "image_url": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400",
        "deep_link": "https://www.booking.com",
    },
    {
        "id": "hotel_003",
        "name": "Khách sạn Bạch Đằng Đà Nẵng",
        "address": "50 Bạch Đằng, Hải Châu, Đà Nẵng",
        "stars": 3,
        "rating": 7.8,
        "price_per_night": 650000,
        "total_price": 1950000,
        "currency": "VND",
        "amenities": ["WiFi", "Breakfast included"],
        "image_url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400",
        "deep_link": "https://www.booking.com",
    },
]


async def booking_search_node(state: AgentState) -> AgentState:
    """Search for flights or hotels based on intent and booking_params using Travelport Client."""
    from datetime import date, timedelta
    from app.services.travelport_service import TravelportClient
    
    intent = state.get("intent", "SEARCH_FLIGHT")
    params = state.get("booking_params", {})
    travelport = TravelportClient()

    if intent == "SEARCH_FLIGHT":
        origin = params.get("origin") or "HAN"
        destination = params.get("destination") or "DAD"
        dep_date = params.get("departure_date") or (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")
        adults = int(params.get("adults") or 1)
        
        results = await travelport.search_flights(origin, destination, dep_date, adults)
        state["booking_results"] = results
        state["messages"] = []  # will be filled by booking_finalize
    elif intent == "SEARCH_HOTEL":
        location = params.get("city_code") or params.get("destination") or "Da Nang"
        checkin = params.get("checkin") or (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")
        checkout = params.get("checkout") or (date.today() + timedelta(days=10)).strftime("%Y-%m-%d")
        adults = int(params.get("adults") or 1)
        
        results = await travelport.search_hotels(location, checkin, checkout, adults)
        state["booking_results"] = results
        state["messages"] = []
    else:
        state["booking_results"] = []

    return state


async def booking_finalize_node(state: AgentState) -> AgentState:
    """Format booking results into assistant message."""
    intent = state.get("intent", "SEARCH_FLIGHT")
    results = state.get("booking_results", [])

    if not results:
        state["messages"] = [
            {"role": "assistant", "content": "Không tìm thấy kết quả phù hợp. Vui lòng thử lại với thông tin khác."}
        ]
        return state

    if intent == "SEARCH_FLIGHT":
        count = len(results)
        cheapest = min(results, key=lambda x: x.get("price", 0))
        content = (
            f"✈️ Tìm thấy **{count} chuyến bay** phù hợp! "
            f"Giá rẻ nhất: **{cheapest['airline']} {cheapest['flight_number']}** "
            f"lúc {cheapest['departure_time']} — "
            f"**{cheapest['price']:,} {cheapest['currency']}**. "
            "Bạn có thể xem và chọn chuyến bay trong danh sách bên dưới."
        )
    else:
        count = len(results)
        cheapest = min(results, key=lambda x: x.get("price_per_night", 0))
        content = (
            f"🏨 Tìm thấy **{count} khách sạn** phù hợp! "
            f"Giá thấp nhất: **{cheapest['name']}** — "
            f"**{cheapest['price_per_night']:,} {cheapest['currency']}/đêm**. "
            "Bạn có thể xem và chọn khách sạn trong danh sách bên dưới."
        )

    state["messages"] = [{"role": "assistant", "content": content}]
    return state


# ---------------------------------------------------------------------------
# Build booking subgraph
# ---------------------------------------------------------------------------

def build_booking_graph() -> StateGraph:
    """Build the Booking Agent subgraph."""
    graph = StateGraph(AgentState)

    graph.add_node("booking_search", timed_node("booking_search", booking_search_node))
    graph.add_node("booking_finalize", timed_node("booking_finalize", booking_finalize_node))

    graph.set_entry_point("booking_search")
    graph.add_edge("booking_search", "booking_finalize")
    graph.add_edge("booking_finalize", END)

    return graph
