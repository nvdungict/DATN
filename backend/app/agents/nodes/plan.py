import json
from datetime import date, timedelta
from langchain_openai import ChatOpenAI
from app.agents.state import AgentState
from app.core.config import get_settings

settings = get_settings()
llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0.3)


PLAN_PROMPT = """You are a professional travel planner. Create a detailed itinerary based on the following information.

User request: {user_message}
Destination: {location}
Start date: {start_date}
End date: {end_date}
Total Days: {num_days}
Budget: {budget} {currency}
Adults / Number of people: {adults}
Travel profile / preferences: {preferences}
Search results about the destination: {search_results}
Previous memories / constraints: {memory_context}
Existing Itinerary (if modifying): {existing_itinerary}
Weather forecast for the trip dates:
{weather_context}

CRITICAL INSTRUCTION FOR MODIFYING TRIPS:
If an Existing Itinerary is provided, you MUST preserve all activities and timings that the user did not explicitly ask to change. ONLY modify what is requested. Ensure the new times still adhere to the density and timings rules below.


CRITICAL INSTRUCTION FOR DURATION:
You MUST generate exactly {num_days} days of activities. The `day_number` MUST range from 1 to {num_days}. Do NOT generate any activities for days beyond {num_days}.

GDS AVAILABLE INVENTORY:
{gds_offers_context}

CRITICAL INSTRUCTION FOR LOGISTICS:
You MUST integrate real booking logistics directly into the itinerary using ONLY the options provided in the "GDS AVAILABLE INVENTORY" above.
1. On day_number=1, if "GDS AVAILABLE INVENTORY" contains flights (type FLIGHT) that logically match the trip, include an item of type "TRANSPORT" for the inbound flight. You MUST select a flight from the available inventory. Set `activity_details.name` to the airline and flight number, `estimated_cost` to the price, and `booking_link` to the flight's exact ID. If no logical flights are provided (e.g. origin and destination are too close, or no flights in inventory), use a generic "TRANSPORT" item (e.g., Bus, Train, or Car) without a booking_link.
2. On day_number=1, include EXACTLY ONE item of type "LODGING" for hotel check-in. This MUST be scheduled exactly between 14:00 and 15:00. You MUST select a hotel from the available inventory. Set `activity_details.name` to the exact hotel name, `estimated_cost` to the price, and `booking_link` to the hotel's exact ID (e.g., "hotel_001"). Do NOT add LODGING items on intermediate days!
3. On the last day, include EXACTLY ONE item of type "LODGING" for hotel check-out. This MUST be scheduled exactly between 11:00 and 12:00. Then, if you included an inbound flight, include an item of type "TRANSPORT" for the outbound flight, using another flight from the inventory. Otherwise, use a generic "TRANSPORT" item for the return trip.
4. On EVERY day, include an item of type "TRANSPORT" named "Local Transportation (Taxi/Grab)" or "Chi phí đi lại nội địa". Set a reasonable `estimated_cost` to cover travel between locations for that day.
5. STRICT BUDGET RULE: You MUST ensure that the SUM of all `estimated_cost` fields across ALL itinerary items (Flights, Hotels, Meals, Attractions, and Local Transport) does NOT exceed the total {budget} {currency}.
6. On day_number=1, include an item of type "OTHER" named "Contingency Fund" or "Dự phòng rủi ro". The `estimated_cost` for this item MUST be exactly equal to the remaining budget after subtracting all other expenses from the total {budget} {currency}. If there is no remaining budget, reduce some other expenses to ensure there is at least a small Contingency Fund.

CRITICAL INSTRUCTION FOR GROUP PRICING & REALISTIC COSTS:
The GDS AVAILABLE INVENTORY prices are base prices for 1 adult. You MUST multiply all TRANSPORT and LODGING prices from the GDS by {adults} to calculate the final `price`, `total_price`, and `estimated_cost` for the whole group!
For MEAL and ATTRACTION items, you MUST estimate a realistic cost for 1 person and then MULTIPLY IT BY {adults}. For example, if a meal costs 100,000 per person and there are 4 adults, the `estimated_cost` MUST be 400,000. All costs MUST be the total for the entire group of {adults} people.

CRITICAL INSTRUCTION FOR ITINERARY DENSITY & TIMINGS:
The generated itinerary MUST be highly detailed, dense, and follow realistic time schedules. 
You MUST adhere strictly to logical time slots. Do NOT schedule breakfast late (e.g., 10:00 AM). 
For EVERY single day, you MUST include at least the following structure with these EXACT or VERY SIMILAR time ranges:
- 07:30 to 08:30: Breakfast (type: MEAL)
- 09:00 to 11:30: Morning Activity (type: ATTRACTION)
- 12:00 to 13:30: Lunch (type: MEAL)
- 14:00 to 17:00: Afternoon Activity (type: ATTRACTION)
- 18:30 to 20:00: Dinner (type: MEAL)
- 20:30 to 22:30: Evening Activity / Nightlife (type: ATTRACTION)
EXCEPT for the last day: on the last day, the itinerary should END when the outbound TRANSPORT item departs. Do NOT schedule any activities after the return trip. Make sure consecutive locations make geographic sense and times do NOT overlap.

CRITICAL INSTRUCTION FOR WEATHER-AWARE PLANNING:
You MUST use the "Weather forecast for the trip dates" when choosing and timing activities.
1. If a day has high rain chance (60% or higher), prioritize indoor attractions, museums, cafes, cooking classes, covered markets, spas, or shopping for the rainy time slots. Avoid beaches, viewpoints, hiking, cycling, boat trips, and long outdoor walks during rainy periods.
2. If a day is very hot (max temperature 33C or higher) or UV is high (7 or higher), schedule outdoor attractions in the morning or after 16:00, and use indoor/rest/cafe activities around midday and early afternoon.
3. If weather alerts are present, avoid weather-sensitive activities and mention the alert in the activity note.
4. If forecast coverage is partial or unavailable, do not invent precise weather. Plan normally, but include flexible backup notes for outdoor activities.
5. In `activity_details.note`, briefly explain weather-aware choices when relevant, for example: "Indoor option because rain is likely" or "Outdoor visit placed early to avoid heat/UV".

Generate a complete day-by-day itinerary. Return a JSON object with:
{{
  "trip": {{
    "title": "...",
    "destination": "...",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "total_budget": float,
    "currency": "..."
  }},
  "itinerary_items": [
    {{
      "day_number": 1,
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "type": "ATTRACTION|MEAL|TRANSPORT|LODGING|OTHER",
      "activity_details": {{
        "name": "...",
        "address": "...", // MUST be a REAL address or street name. NEVER use fake placeholders like '123 Main St'. If unknown, use the city name.
        "lat": float,
        "lng": float,
        "note": "...",
        "estimated_cost": float, // EXACT value in {currency}. DO NOT abbreviate (e.g. use 500000, not 500).
        "currency": "...", // MUST be {currency}
        "booking_link": "...", // MUST be the exact ID from GDS inventory
        // FOR TRANSPORT ONLY (MUST match inventory):
        "airline": "...", "flight_number": "...", "departure_airport": "...", "arrival_airport": "...", "departure_time": "...", "arrival_time": "...", "price": float,
        // FOR LODGING ONLY (MUST match inventory):
        "stars": int, "rating": float, "total_price": float
      }}
    }}
  ],
  "messages": [{{"role": "assistant", "content": "..."}}]
}}

CRITICAL INSTRUCTION FOR PRICING & ADDRESSES:
1. Provide `estimated_cost` in the exact currency requested ({currency}). Do NOT abbreviate numbers (e.g., if the price is 50,000 VND, write 50000, do NOT write 50). Ensure the estimated cost is realistic for {adults} people.
2. NEVER use placeholder addresses like "123 Main St". Use real streets or landmarks.

Return ONLY valid JSON."""



async def plan_node(state: AgentState) -> AgentState:
    """Generate or modify a full itinerary using LLM."""
    entities = state.get("entities") or {}
    existing_trip = state.get("existing_trip") or {}
    
    location = entities.get("location") or existing_trip.get("destination") or "Unknown destination"
    budget = entities.get("budget") or existing_trip.get("total_budget") or 500
    currency = entities.get("currency") or existing_trip.get("currency") or "USD"
    preferences = entities.get("preferences") or []
    user_profile = state.get("user_profile")
    merged_prefs = list(preferences)
    if user_profile:
        merged_prefs.append(f"Permanent User Profile: {json.dumps(user_profile, ensure_ascii=False)}")
    
    start_date = entities.get("start_date") or existing_trip.get("start_date")
    if not start_date:
        start_date = str(date.today() + timedelta(days=7))
    elif not isinstance(start_date, str):
        start_date = str(start_date)
        
    num_days = int(entities.get("num_days") or 3)
    adults = int(entities.get("adults") or 1)
    
    end_date = entities.get("end_date") or existing_trip.get("end_date")
    if not end_date:
        try:
            # handle 'YYYY-MM-DD' properly
            end_date = str(date.fromisoformat(start_date[:10]) + timedelta(days=num_days - 1))
        except Exception:
            end_date = str(date.today() + timedelta(days=7 + num_days - 1))
    elif not isinstance(end_date, str):
        end_date = str(end_date)

    search_summary = "\n".join(
        [r.get("content", r.get("message", ""))[:300] for r in (state.get("search_results") or [])]
    )

    gds_offers = state.get("gds_offers") or {"flights": [], "hotels": []}
    gds_context = f"Available Flights:\n{json.dumps(gds_offers.get('flights', [])[:5], indent=2, ensure_ascii=False)}\n\nAvailable Hotels:\n{json.dumps(gds_offers.get('hotels', [])[:5], indent=2, ensure_ascii=False)}"

    prompt = PLAN_PROMPT.format(
        user_message=state["user_message"],
        location=location,
        start_date=start_date,
        end_date=end_date,
        num_days=num_days,
        budget=budget,
        currency=currency,
        adults=adults,
        preferences=", ".join(merged_prefs) if merged_prefs else "None specified",
        search_results=search_summary[:2000] or "No search results available",
        memory_context="\n".join(state.get("memory_context", [])) or "No previous context",
        existing_itinerary=json.dumps(state.get("itinerary_items") or [], ensure_ascii=False, indent=2) if state.get("itinerary_items") else "None",
        weather_context=(state.get("weather_context") or {}).get("summary") or "No weather context available",
        gds_offers_context=gds_context
    )

    response = await llm.ainvoke(prompt)
    content = response.content.strip()

    # Strip markdown code fences if present
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    try:
        parsed = json.loads(content) or {}
        trip = parsed.get("trip") or {}
        # Sanitize None numeric fields from LLM
        trip["total_budget"] = float(trip.get("total_budget") or 0)
        state["trip_data"] = trip
        state["itinerary_items"] = parsed.get("itinerary_items") or []
        if parsed.get("messages"):
            state["messages"] = parsed["messages"]
    except json.JSONDecodeError:
        state["messages"] = [
            {
                "role": "assistant",
                "content": "I generated a plan but encountered a formatting issue. Please try again.",
            }
        ]

    return state
