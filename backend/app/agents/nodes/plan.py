import json
import copy
import unicodedata
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
Maximum contingency fund: {contingency_cap} {currency}
Target planned spending range: {budget_floor} to {budget_ceiling} {currency}
Travel profile / preferences: {preferences}
Search results about the destination: {search_results}
Previous memories / constraints: {memory_context}
Existing Itinerary (if modifying): {existing_itinerary}
Weather forecast for the trip dates:
{weather_context}

CRITICAL INSTRUCTION FOR MODIFYING TRIPS:
If an Existing Itinerary is provided, you MUST preserve all activities and timings that the user did not explicitly ask to change. ONLY modify what is requested. Ensure the new times still adhere to the density and timings rules below.
For MODIFY_TRIP, do NOT re-optimize unrelated days, meals, flights, hotels, or activities. If the user asks for "day 1 afternoon", change only the day 1 afternoon item. If the user asks for breakfast, change only breakfast. Previous changes in the existing itinerary are already accepted and MUST NOT be reported again.
For MODIFY_TRIP responses, the assistant message MUST be specific and action-oriented. It MUST say:
- what was changed,
- the day and time slot affected,
- the old activity name,
- the new activity name,
- and the reason if the user provided one.
Do NOT reply with a generic full-itinerary summary like "Here is your detailed itinerary". Use a concise changelog style, for example: "Updated day 2 afternoon: replaced 'My Khe Beach' with 'Da Nang Museum of Cham Sculpture' because rain is likely."


CRITICAL INSTRUCTION FOR DURATION:
You MUST generate exactly {num_days} days of activities. The `day_number` MUST range from 1 to {num_days}. Do NOT generate any activities for days beyond {num_days}.

GDS AVAILABLE INVENTORY:
{gds_offers_context}

CRITICAL INSTRUCTION FOR LOGISTICS:
You MUST integrate real booking logistics directly into the itinerary using ONLY the options provided in the "GDS AVAILABLE INVENTORY" above.
1. On day_number=1, if "GDS AVAILABLE INVENTORY" contains flights with `"direction": "inbound"`, include an item of type "TRANSPORT" for the inbound flight. You MUST select an inbound flight from the available inventory. The item `start_time` MUST equal the flight `departure_time`, and `end_time` MUST equal the flight `arrival_time`. Do NOT schedule destination activities before the inbound flight arrival time. Set `activity_details.name` to the airline and flight number, `booking_link` to the flight's exact ID, and set `estimated_cost` to the inventory flight price multiplied by {adults}. If no logical flights are provided (e.g. origin and destination are too close, or no flights in inventory), use a generic "TRANSPORT" item (e.g., Bus, Train, or Car) without a booking_link.
2. On day_number=1, include EXACTLY ONE item of type "LODGING" for hotel check-in. If the inbound flight arrives before 14:00, schedule check-in exactly between 14:00 and 15:00. If the inbound flight arrives after 14:00, schedule check-in after the flight arrival plus reasonable transfer time. You MUST select a hotel from the available inventory. Set `activity_details.name` to the exact hotel name, `estimated_cost` to the price, and `booking_link` to the hotel's exact ID (e.g., "hotel_001"). Do NOT add LODGING items on intermediate days!
3. On the last day, include EXACTLY ONE item of type "LODGING" for hotel check-out. If the outbound flight departs after 12:00, schedule check-out exactly between 11:00 and 12:00. If the outbound flight departs before 12:00, schedule check-out BEFORE the outbound flight with enough airport transfer time. Then, if "GDS AVAILABLE INVENTORY" contains flights with `"direction": "outbound"`, include an item of type "TRANSPORT" for the outbound/return flight. You MUST select an outbound flight from the available inventory. The item `start_time` MUST equal the flight `departure_time`, and `end_time` MUST equal the flight `arrival_time`. The outbound/return flight MUST be the final chronological item on the last day.
4. On EVERY day, include an item of type "TRANSPORT" named "Local Transportation (Taxi/Grab)" or "Chi phí đi lại nội địa". Set a reasonable `estimated_cost` to cover travel between locations for that day.
5. STRICT BUDGET RULE: You MUST ensure that the SUM of all `estimated_cost` fields across ALL itinerary items (Flights, Hotels, Meals, Attractions, and Local Transport) does NOT exceed the total {budget} {currency}.
6. On day_number=1, include an item of type "OTHER" named "Contingency Fund". The `estimated_cost` for this item MUST be a modest reserve and MUST NOT exceed {contingency_cap} {currency}. Do NOT use all remaining budget as contingency. If the other planned expenses leave less than {contingency_cap} {currency}, set the contingency to the remaining available amount so the total stays within {budget} {currency}.
7. For leisure trips where the user asks for N days, maximize useful time at the destination: prefer inbound flights that arrive early enough to allow day 1 activities, and prefer outbound flights that depart late enough to allow last-day activities. Do NOT choose a late-night arrival and early-morning return unless no better inventory exists or the user explicitly requests cheapest flights.
8. BUDGET UTILIZATION RULE: The budget is not just a hard cap; it is the user's intended spending level. Unless the user explicitly asks for the cheapest trip, the total planned cost INCLUDING contingency should normally fall within {budget_floor} to {budget_ceiling} {currency}. If your first draft is below {budget_floor} {currency}, upgrade the plan by choosing a better hotel from inventory, better flight options, higher-quality meals, paid cultural experiences, guided tours, spa/relaxation options, or premium local experiences that match the user's preferences. Do NOT solve under-spending by inflating the Contingency Fund above {contingency_cap} {currency}; contingency is only a reserve.

CRITICAL INSTRUCTION FOR GROUP PRICING & REALISTIC COSTS:
The GDS AVAILABLE INVENTORY flight prices are base prices for 1 adult. You MUST multiply all FLIGHT/TRANSPORT prices from the GDS by {adults} to calculate the final `price` and `estimated_cost` for the whole group. Also include `price_per_adult` and `passengers` in `activity_details` for flight items.
For MEAL and ATTRACTION items, you MUST estimate a realistic cost for 1 person and then MULTIPLY IT BY {adults}. For example, if a meal costs 100,000 per person and there are 4 adults, the `estimated_cost` MUST be 400,000. All costs MUST be the total for the entire group of {adults} people.

CRITICAL INSTRUCTION FOR MEALS:
Every MEAL item MUST use a specific restaurant, cafe, market stall, or hotel venue name. Do NOT use generic names such as "Lunch at a local restaurant", "Dinner at a local seafood restaurant", "Breakfast at a local cafe", "Riverside Restaurant", or "Local Pho Restaurant".
For each MEAL item, `activity_details.name` MUST be the venue name and `activity_details.address` MUST be a specific street address, landmark, or neighborhood. If search results do not provide enough detail, choose a well-known named venue for that destination instead of a generic description.

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
EXCEPT for the last day: on the last day, the itinerary MUST END with the outbound/return TRANSPORT item. Do NOT schedule any meals, attractions, checkout, local transport, or other activities after the outbound flight departure time. If the return flight departs in the morning, skip later last-day activities instead of placing them after the flight. Make sure consecutive locations make geographic sense and times do NOT overlap.
If the day 1 inbound flight arrives late, skip or reduce earlier day 1 destination activities rather than scheduling activities before the traveler reaches the destination.

CRITICAL INSTRUCTION FOR WEATHER-AWARE PLANNING:
You MUST use the "Weather forecast for the trip dates" when choosing and timing activities.
1. If rain chance is low (below 40%), DO NOT choose indoor activities just because of weather. Plan beaches, viewpoints, bridges, walking areas, and outdoor cultural attractions normally when they match the user's preferences.
2. If rain chance is moderate (40% to 74%), keep the trip balanced: keep outdoor activities when they are important to the user's preferences, place them in safer morning/evening slots where possible, and add a brief indoor backup note. Do NOT replace most outdoor activities with museums/malls for moderate rain alone.
3. If a day has very high rain chance (75% or higher), prioritize indoor attractions, museums, cafes, cooking classes, covered markets, spas, or shopping for the rainy time slots. Avoid beaches, viewpoints, hiking, cycling, boat trips, and long outdoor walks during rainy periods.
4. If a day is very hot (max temperature 33C or higher) or UV is high (7 or higher), schedule outdoor attractions in the morning or after 16:00, but still include outdoor activities if the weather is otherwise suitable. Use indoor/rest/cafe activities mainly around midday and early afternoon.
5. If weather alerts are present, avoid weather-sensitive activities and mention the alert in the activity note.
6. If forecast coverage is partial or unavailable, do not invent precise weather. Plan normally, but include flexible backup notes for outdoor activities.
7. In `activity_details.note`, briefly explain weather-aware choices when relevant, for example: "Outdoor visit placed early to avoid heat/UV" or "Indoor backup available if rain increases". Only use "Indoor option because rain is likely" when rain chance is 75% or higher.

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
        "name": "...", // For MEAL, this MUST be a specific restaurant/cafe/stall name, not a generic description.
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
3. For MEAL items, NEVER use generic restaurant names. Use a real named venue and a specific address/street.

Return ONLY valid JSON."""


def _to_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        if isinstance(value, str):
            value = value.replace(",", "").strip()
        return float(value)
    except (TypeError, ValueError):
        return default


def _is_contingency_item(item: dict) -> bool:
    details = item.get("activity_details") or {}
    name = str(details.get("name") or "").lower()
    return item.get("type") == "OTHER" and (
        "contingency" in name
        or "dự phòng" in name
        or "du phong" in name
        or "reserve" in name
    )


def _normalize_text(value: object) -> str:
    return str(value or "").lower().strip()


def _item_type_value(item: dict) -> str:
    item_type = item.get("type")
    if hasattr(item_type, "value"):
        return str(item_type.value)
    return str(item_type or "").split(".")[-1]


def _plain_text(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or "").lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join("".join(ch if ch.isalnum() else " " for ch in text).split())


def _time_to_minutes(value: object) -> int | None:
    if not value:
        return None
    try:
        hour, minute = str(value)[:5].split(":")
        return int(hour) * 60 + int(minute)
    except (TypeError, ValueError):
        return None


def _minutes_to_time(value: int) -> str:
    value = max(min(value, 23 * 60 + 59), 0)
    hour, minute = divmod(value, 60)
    return f"{hour:02d}:{minute:02d}"


def _set_item_time(item: dict, start: int, end: int) -> None:
    item["start_time"] = _minutes_to_time(start)
    item["end_time"] = _minutes_to_time(max(end, start + 15))


def _is_local_transport_or_hidden(item: dict) -> bool:
    details = item.get("activity_details") or {}
    name = _normalize_text(details.get("name"))
    return _item_type_value(item) == "OTHER" or "local transport" in name or "chi phí đi lại" in name or "chi phi di lai" in name


def _meal_kind(item: dict) -> str | None:
    if _item_type_value(item) != "MEAL":
        return None
    name = _normalize_text((item.get("activity_details") or {}).get("name"))
    if "breakfast" in name or "bữa sáng" in name or "bua sang" in name:
        return "breakfast"
    if "lunch" in name or "bữa trưa" in name or "bua trua" in name:
        return "lunch"
    if "dinner" in name or "bữa tối" in name or "bua toi" in name:
        return "dinner"
    return None


def _is_generic_meal_name(name: object) -> bool:
    text = _normalize_text(name)
    if not text:
        return True
    generic_phrases = (
        "local restaurant",
        "local seafood restaurant",
        "local cafe",
        "local café",
        "local pho restaurant",
        "riverside restaurant",
        "seafood restaurant",
        "thai restaurant",
        "a local",
        "the hotel",
    )
    starts_generic = (
        "breakfast at a local",
        "breakfast at local",
        "lunch at a local",
        "lunch at local",
        "dinner at a local",
        "dinner at local",
        "lunch at a seafood restaurant",
        "dinner at a seafood restaurant",
        "dinner at a thai restaurant",
        "lunch at a thai restaurant",
    )
    return any(text.startswith(prefix) for prefix in starts_generic) or any(phrase in text for phrase in generic_phrases)


def _meal_fallbacks_for_destination(destination: str) -> list[dict]:
    dest = _normalize_text(destination)
    if "da nang" in dest or "đà nẵng" in dest or "đà nang" in dest:
        return [
            {
                "kind": "breakfast",
                "keywords": ("breakfast", "bún", "bun", "noodle"),
                "name": "Bún Chả Cá Bà Lữ",
                "address": "319 Hùng Vương, Hải Châu, Đà Nẵng",
                "lat": 16.0669,
                "lng": 108.2208,
            },
            {
                "kind": "lunch",
                "keywords": ("bánh xèo", "banh xeo", "local", "lunch"),
                "name": "Bánh Xèo Bà Dưỡng",
                "address": "K280/23 Hoàng Diệu, Hải Châu, Đà Nẵng",
                "lat": 16.0579,
                "lng": 108.2175,
            },
            {
                "kind": "lunch",
                "keywords": ("mì quảng", "mi quang", "noodle"),
                "name": "Mì Quảng Bà Mua",
                "address": "19-21 Trần Bình Trọng, Hải Châu, Đà Nẵng",
                "lat": 16.0662,
                "lng": 108.2195,
            },
            {
                "kind": "dinner",
                "keywords": ("seafood", "hải sản", "hai san"),
                "name": "Hải Sản Bé Mặn",
                "address": "Lô 14 Hoàng Sa, Sơn Trà, Đà Nẵng",
                "lat": 16.0910,
                "lng": 108.2468,
            },
            {
                "kind": "dinner",
                "keywords": ("thai", "thái", "thai restaurant"),
                "name": "Thai Market Restaurant",
                "address": "183 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
                "lat": 16.0595,
                "lng": 108.2218,
            },
            {
                "kind": "dinner",
                "keywords": ("dinner", "local", "riverside"),
                "name": "Madame Lân",
                "address": "4 Bạch Đằng, Hải Châu, Đà Nẵng",
                "lat": 16.0742,
                "lng": 108.2243,
            },
        ]
    return []


def _replace_generic_meals(items: list[dict], destination: str) -> list[dict]:
    fallbacks = _meal_fallbacks_for_destination(destination)
    if not fallbacks:
        return items

    used_names: set[str] = set()
    for item in items:
        if item.get("type") != "MEAL":
            continue
        details = item.setdefault("activity_details", {})
        name = details.get("name")
        if name:
            used_names.add(_normalize_text(name))
        if not _is_generic_meal_name(name):
            continue

        kind = _meal_kind(item)
        current_text = _normalize_text(" ".join(str(details.get(key) or "") for key in ("name", "note", "address")))
        candidates = [
            place for place in fallbacks
            if (not kind or place["kind"] == kind)
            and _normalize_text(place["name"]) not in used_names
        ]
        if current_text:
            keyword_matches = [
                place for place in candidates
                if any(keyword in current_text for keyword in place["keywords"])
            ]
            if keyword_matches:
                candidates = keyword_matches
        if not candidates:
            candidates = [
                place for place in fallbacks
                if _normalize_text(place["name"]) not in used_names
            ] or fallbacks

        replacement = candidates[0]
        details["name"] = replacement["name"]
        details["address"] = replacement["address"]
        details["lat"] = replacement["lat"]
        details["lng"] = replacement["lng"]
        note = details.get("note") or ""
        replacement_note = "Specific restaurant selected to avoid a generic meal placeholder."
        if replacement_note not in note:
            details["note"] = f"{note} {replacement_note}".strip()
        used_names.add(_normalize_text(replacement["name"]))

    return items


def _is_weather_sensitive_attraction(item: dict) -> bool:
    if item.get("type") != "ATTRACTION":
        return False
    details = item.get("activity_details") or {}
    text = _plain_text(" ".join(str(details.get(key) or "") for key in ("name", "address", "note")))
    outdoor_keywords = (
        "beach", "my khe", "non nuoc", "son tra", "peninsula", "marble mountains",
        "mountain", "pagoda", "viewpoint", "bridge", "river cruise", "cruise",
        "dragon bridge", "han river", "hiking", "walking", "park", "outdoor",
        "bien", "bai bien", "ngu hanh son", "ban dao", "cau rong", "du thuyen",
    )
    indoor_keywords = (
        "museum", "indoor", "market", "mall", "shopping", "cafe", "spa",
        "gallery", "workshop", "cooking class", "covered", "bao tang", "cho",
    )
    if any(keyword in text for keyword in indoor_keywords):
        return False
    return any(keyword in text for keyword in outdoor_keywords)


def _weather_safe_attractions_for_destination(destination: str) -> list[dict]:
    dest = _normalize_text(destination)
    if "da nang" in dest or "đà nẵng" in dest or "đà nang" in dest:
        return [
            {
                "name": "Da Nang Museum of Cham Sculpture",
                "address": "2 Đường 2 Tháng 9, Hải Châu, Đà Nẵng",
                "lat": 16.0605,
                "lng": 108.2230,
                "estimated_cost": 60000,
            },
            {
                "name": "Han Market",
                "address": "119 Trần Phú, Hải Châu, Đà Nẵng",
                "lat": 16.0685,
                "lng": 108.2248,
                "estimated_cost": 50000,
            },
            {
                "name": "Con Market",
                "address": "290 Hùng Vương, Hải Châu, Đà Nẵng",
                "lat": 16.0678,
                "lng": 108.2145,
                "estimated_cost": 50000,
            },
            {
                "name": "Lotte Mart Da Nang",
                "address": "6 Nại Nam, Hải Châu, Đà Nẵng",
                "lat": 16.0367,
                "lng": 108.2249,
                "estimated_cost": 80000,
            },
            {
                "name": "Da Nang Fine Arts Museum",
                "address": "78 Lê Duẩn, Hải Châu, Đà Nẵng",
                "lat": 16.0711,
                "lng": 108.2195,
                "estimated_cost": 50000,
            },
            {
                "name": "Vincom Plaza Ngo Quyen",
                "address": "910A Ngô Quyền, Sơn Trà, Đà Nẵng",
                "lat": 16.0705,
                "lng": 108.2328,
                "estimated_cost": 80000,
            },
        ]
    return []


def _very_high_rain_days(weather_context: dict | None) -> dict[int, dict]:
    if not weather_context:
        return {}
    raw = weather_context.get("raw") or {}
    if not weather_context.get("available") and raw.get("unavailable"):
        return {}
    high_days: dict[int, dict] = {}
    for index, day in enumerate(raw.get("days") or [], start=1):
        try:
            rain = float(day.get("chance_of_rain"))
        except (TypeError, ValueError):
            continue
        if rain >= 75:
            high_days[index] = day
    return high_days


def _apply_weather_safety(items: list[dict], destination: str, weather_context: dict | None) -> list[dict]:
    high_days = _very_high_rain_days(weather_context)
    fallbacks = _weather_safe_attractions_for_destination(destination)
    if not high_days or not fallbacks:
        return items

    used_names = {
        _normalize_text((item.get("activity_details") or {}).get("name"))
        for item in items
    }
    fallback_index = 0

    for item in items:
        day_number = int(item.get("day_number") or 1)
        day_weather = high_days.get(day_number)
        if not day_weather or not _is_weather_sensitive_attraction(item):
            continue

        replacement = None
        for offset in range(len(fallbacks)):
            candidate = fallbacks[(fallback_index + offset) % len(fallbacks)]
            if _normalize_text(candidate["name"]) not in used_names:
                replacement = candidate
                fallback_index = fallback_index + offset + 1
                break
        if replacement is None:
            replacement = fallbacks[fallback_index % len(fallbacks)]
            fallback_index += 1

        details = item.setdefault("activity_details", {})
        old_name = details.get("name") or "outdoor activity"
        existing_cost = _to_float(details.get("estimated_cost"))
        details["name"] = replacement["name"]
        details["address"] = replacement["address"]
        details["lat"] = replacement["lat"]
        details["lng"] = replacement["lng"]
        details["estimated_cost"] = max(existing_cost, _to_float(replacement.get("estimated_cost")))
        details["note"] = (
            f"Weather-adjusted indoor option replacing {old_name} because rain chance "
            f"is {day_weather.get('chance_of_rain')}% on {day_weather.get('date')}."
        )
        used_names.add(_normalize_text(replacement["name"]))

    return items


def _find_day_flight_time(items: list[dict], day_number: int, direction: str, field: str) -> int | None:
    candidates = []
    for item in items:
        details = item.get("activity_details") or {}
        if (
            item.get("type") == "TRANSPORT"
            and int(item.get("day_number") or 1) == day_number
            and details.get("direction") == direction
        ):
            value = _time_to_minutes(item.get(field))
            if value is not None:
                candidates.append(value)
    if not candidates:
        return None
    return min(candidates) if direction == "outbound" else max(candidates)


def _normalize_generated_schedule(items: list[dict], max_day: int) -> list[dict]:
    """Fix common LLM timing drift while preserving selected flights/hotels/activities."""
    inbound_arrival = _find_day_flight_time(items, 1, "inbound", "end_time")
    outbound_departure = _find_day_flight_time(items, max_day, "outbound", "start_time")

    for day in sorted({int(item.get("day_number") or 1) for item in items}):
        day_items = [
            item for item in items
            if int(item.get("day_number") or 1) == day and not _is_local_transport_or_hidden(item)
        ]
        attractions = [
            item for item in day_items
            if item.get("type") == "ATTRACTION"
        ]
        breakfast = next((item for item in day_items if _meal_kind(item) == "breakfast"), None)
        lunch = next((item for item in day_items if _meal_kind(item) == "lunch"), None)
        dinner = next((item for item in day_items if _meal_kind(item) == "dinner"), None)
        lodging_items = [item for item in day_items if item.get("type") == "LODGING"]

        earliest_day1_destination_time = 7 * 60 + 30
        if day == 1 and inbound_arrival is not None:
            earliest_day1_destination_time = max(7 * 60 + 30, inbound_arrival + 30)

        if day == 1:
            checkin_start = 14 * 60
            if inbound_arrival is not None and inbound_arrival >= 14 * 60:
                checkin_start = min(inbound_arrival + 45, 21 * 60)
            for lodging in lodging_items[:1]:
                _set_item_time(lodging, checkin_start, checkin_start + 60)
        elif day == max_day:
            checkout_end = 12 * 60
            if outbound_departure is not None and outbound_departure < 12 * 60:
                checkout_end = max(outbound_departure - 45, 0)
            for lodging in lodging_items[:1]:
                _set_item_time(lodging, max(checkout_end - 60, 0), checkout_end)

        breakfast_end = None
        if breakfast and earliest_day1_destination_time <= 10 * 60:
            breakfast_start = max(7 * 60 + 30, earliest_day1_destination_time)
            breakfast_end = min(breakfast_start + 60, 9 * 60 if breakfast_start <= 8 * 60 + 15 else 10 * 60)
            _set_item_time(breakfast, breakfast_start, breakfast_end)
        elif breakfast and day != 1:
            breakfast_end = 8 * 60 + 30
            _set_item_time(breakfast, 7 * 60 + 30, breakfast_end)

        if lunch:
            _set_item_time(lunch, 12 * 60, 13 * 60 + 30)
        if dinner:
            _set_item_time(dinner, 18 * 60 + 30, 20 * 60)

        attraction_slots: list[tuple[int, int]] = []
        morning_start = max(9 * 60, earliest_day1_destination_time + 30 if day == 1 else 9 * 60)
        if breakfast_end is not None:
            morning_start = max(morning_start, breakfast_end + 15)
        if morning_start <= 10 * 60 + 30:
            attraction_slots.append((morning_start, 11 * 60 + 30))
        if day == 1 and lodging_items:
            checkin_end = _time_to_minutes(lodging_items[0].get("end_time")) or 15 * 60
            attraction_slots.append((max(14 * 60, checkin_end + 30), 17 * 60 + 30))
        else:
            attraction_slots.append((14 * 60, 17 * 60))
        attraction_slots.append((20 * 60 + 30, 22 * 60 + 30))

        if day == max_day and outbound_departure is not None:
            attraction_slots = [
                (start, min(end, outbound_departure - 60))
                for start, end in attraction_slots
                if start < outbound_departure - 60
            ]

        for attraction, (start, end) in zip(attractions, attraction_slots):
            if end > start:
                _set_item_time(attraction, start, end)

    return sorted(
        items,
        key=lambda item: (
            int(item.get("day_number") or 1),
            _time_to_minutes(item.get("start_time")) if _time_to_minutes(item.get("start_time")) is not None else 24 * 60,
            item.get("type") or "",
        ),
    )


def _sort_flights_for_planning(flights: list[dict], direction: str | None = None) -> list[dict]:
    direction_flights = [flight for flight in flights if not direction or flight.get("direction") == direction]
    def inbound_window_score(flight: dict) -> tuple:
        arrival = _time_to_minutes(flight.get("arrival_time"))
        if arrival is None:
            return (9, 24 * 60, _to_float(flight.get("price"), 10**12))
        if 7 * 60 <= arrival <= 12 * 60:
            return (0, arrival, _to_float(flight.get("price"), 10**12))
        if 6 * 60 <= arrival < 7 * 60:
            return (1, arrival, _to_float(flight.get("price"), 10**12))
        if 12 * 60 < arrival <= 15 * 60:
            return (2, arrival, _to_float(flight.get("price"), 10**12))
        if arrival < 6 * 60:
            return (3, arrival, _to_float(flight.get("price"), 10**12))
        return (4, arrival, _to_float(flight.get("price"), 10**12))

    def outbound_window_score(flight: dict) -> tuple:
        departure = _time_to_minutes(flight.get("departure_time"))
        if departure is None:
            return (9, 0, _to_float(flight.get("price"), 10**12))
        if 18 * 60 <= departure <= 22 * 60 + 30:
            return (0, -departure, _to_float(flight.get("price"), 10**12))
        if 16 * 60 <= departure < 18 * 60:
            return (1, -departure, _to_float(flight.get("price"), 10**12))
        if 22 * 60 + 30 < departure <= 23 * 60 + 59:
            return (2, -departure, _to_float(flight.get("price"), 10**12))
        if 12 * 60 <= departure < 16 * 60:
            return (3, -departure, _to_float(flight.get("price"), 10**12))
        return (4, -departure, _to_float(flight.get("price"), 10**12))

    if direction == "outbound":
        return sorted(direction_flights, key=outbound_window_score)
    if direction == "inbound":
        return sorted(direction_flights, key=inbound_window_score)
    return sorted(
        direction_flights,
        key=lambda flight: (
            flight.get("direction") or "",
            _time_to_minutes(flight.get("departure_time")) if _time_to_minutes(flight.get("departure_time")) is not None else 24 * 60,
            _to_float(flight.get("price"), 10**12),
        ),
    )


def _is_flight_like_transport(item: dict) -> bool:
    if item.get("type") != "TRANSPORT":
        return False
    details = item.get("activity_details") or {}
    text = _normalize_text(
        " ".join(
            str(details.get(key) or "")
            for key in ("name", "airline", "flight_number", "booking_link", "departure_airport", "arrival_airport")
        )
    )
    return any(keyword in text for keyword in ("flight", "air", "vietjet", "airlines", "airport", "agoda_flight", "vj", "vn", "vu", "9g"))


def _find_matching_flight_offer(details: dict, flights: list[dict]) -> dict | None:
    booking_id = _normalize_text(details.get("booking_link") or details.get("id"))
    flight_number = _normalize_text(details.get("flight_number"))
    airline = _normalize_text(details.get("airline"))
    name = _normalize_text(details.get("name"))

    for flight in flights:
        offer_id = _normalize_text(flight.get("id"))
        if booking_id and booking_id == offer_id:
            return flight

    for flight in flights:
        offer_flight_number = _normalize_text(flight.get("flight_number"))
        offer_airline = _normalize_text(flight.get("airline"))
        offer_airline_code = _normalize_text(flight.get("airline_code"))
        if flight_number and flight_number == offer_flight_number:
            return flight
        if offer_flight_number and offer_flight_number in name:
            return flight
        if offer_airline_code and offer_flight_number and f"{offer_airline_code}{offer_flight_number}".replace(" ", "") in name.replace(" ", ""):
            return flight
        if offer_airline and offer_flight_number and offer_airline in name and offer_flight_number in name:
            return flight

    return None


def _enforce_return_flight_is_last(items: list[dict], max_day: int) -> list[dict]:
    outbound_items = []
    for item in items:
        details = item.get("activity_details") or {}
        if (
            item.get("type") == "TRANSPORT"
            and int(item.get("day_number") or 1) == max_day
            and details.get("direction") == "outbound"
            and details.get("flight_number")
        ):
            outbound_items.append(item)

    if not outbound_items:
        return items

    outbound_item = min(
        outbound_items,
        key=lambda item: _time_to_minutes(item.get("start_time")) or 24 * 60,
    )
    cutoff = _time_to_minutes(outbound_item.get("start_time"))
    if cutoff is None:
        return items

    adjusted_items = []
    checkout_adjusted = False
    for item in items:
        if item is outbound_item:
            adjusted_items.append(item)
            continue

        day_number = int(item.get("day_number") or 1)
        if day_number != max_day:
            adjusted_items.append(item)
            continue

        start = _time_to_minutes(item.get("start_time"))
        end = _time_to_minutes(item.get("end_time"))

        if item.get("type") == "LODGING":
            # Keep check-out, but move it before a morning return flight.
            if start is None or start >= cutoff or (end is not None and end > cutoff):
                checkout_end = max(cutoff - 15, 0)
                checkout_start = max(checkout_end - 30, 0)
                item["start_time"] = _minutes_to_time(checkout_start)
                item["end_time"] = _minutes_to_time(checkout_end)
                details = item.setdefault("activity_details", {})
                details["note"] = "Early check-out scheduled before the return flight."
            if not checkout_adjusted:
                adjusted_items.append(item)
                checkout_adjusted = True
            continue

        # Drop any last-day activity that starts after, or overlaps, the return flight departure.
        if start is None:
            adjusted_items.append(item)
            continue
        if start >= cutoff or (end is not None and end > cutoff):
            continue
        adjusted_items.append(item)

    return sorted(
        adjusted_items,
        key=lambda item: (
            int(item.get("day_number") or 1),
            _time_to_minutes(item.get("start_time")) if _time_to_minutes(item.get("start_time")) is not None else 24 * 60,
            item.get("type") or "",
        ),
    )


def _round_budget_amount(value: float, currency: str) -> float:
    currency = (currency or "").upper()
    if currency == "VND":
        return float(round(value / 10000) * 10000)
    return round(value, 2)


def _is_budget_upgrade_candidate(item: dict) -> bool:
    item_type = item.get("type")
    if item_type in ("MEAL", "ATTRACTION"):
        return True
    if item_type == "TRANSPORT" and not _is_flight_like_transport(item):
        details = item.get("activity_details") or {}
        name = _normalize_text(details.get("name"))
        return "local transportation" in name or "taxi" in name or "grab" in name or "đi lại" in name or "di lai" in name
    return False


def _improve_budget_utilization(items: list[dict], budget: float, currency: str) -> list[dict]:
    """Use the user's budget more realistically without inflating real booking prices."""
    budget = _to_float(budget)
    if budget <= 0:
        return items

    current_total = sum(
        _to_float((item.get("activity_details") or {}).get("estimated_cost"))
        for item in items
    )
    target_total = budget * 0.85
    gap = min(target_total - current_total, budget - current_total)
    if gap <= 0:
        return items

    candidates = [item for item in items if _is_budget_upgrade_candidate(item)]
    if not candidates:
        return items

    def weight(item: dict) -> float:
        if item.get("type") == "ATTRACTION":
            return 3.0
        if item.get("type") == "MEAL":
            return 2.0
        return 1.0

    total_weight = sum(weight(item) for item in candidates)
    remaining_gap = gap

    for index, item in enumerate(candidates):
        details = item.setdefault("activity_details", {})
        current_cost = _to_float(details.get("estimated_cost"))
        if index == len(candidates) - 1:
            addition = remaining_gap
        else:
            addition = gap * weight(item) / total_weight
            remaining_gap -= addition

        upgraded_cost = _round_budget_amount(current_cost + addition, currency)
        if upgraded_cost <= current_cost:
            upgraded_cost = current_cost + max(_round_budget_amount(addition, currency), addition)

        details["estimated_cost"] = upgraded_cost
        details["currency"] = details.get("currency") or currency
        note = details.get("note") or ""
        upgrade_note = "Budget utilization adjusted for a higher-quality experience."
        if upgrade_note not in note:
            details["note"] = f"{note} {upgrade_note}".strip()

    # Rounding can overshoot slightly; trim the last flexible item if needed.
    final_total = sum(
        _to_float((item.get("activity_details") or {}).get("estimated_cost"))
        for item in items
    )
    overshoot = final_total - budget
    if overshoot > 0:
        for item in reversed(candidates):
            details = item.get("activity_details") or {}
            current_cost = _to_float(details.get("estimated_cost"))
            original_floor = 0.0
            reducible = max(current_cost - original_floor, 0.0)
            reduction = min(overshoot, reducible)
            if reduction > 0:
                details["estimated_cost"] = _round_budget_amount(current_cost - reduction, currency)
                break

    return items


def _normalize_group_pricing_and_contingency(
    items: list[dict],
    gds_offers: dict,
    adults: int,
    budget: float,
    currency: str,
    destination: str = "",
    weather_context: dict | None = None,
) -> list[dict]:
    """Apply deterministic pricing rules after the LLM returns JSON."""
    adults = max(int(adults or 1), 1)
    budget = _to_float(budget)
    contingency_cap = max(budget * 0.10, 0.0)
    flights = gds_offers.get("flights") or []
    max_day = max((int(item.get("day_number") or 1) for item in items), default=1)

    for item in items:
        details = item.setdefault("activity_details", {})
        candidate_flights = flights
        if item.get("type") == "TRANSPORT":
            day_number = int(item.get("day_number") or 1)
            desired_direction = None
            if day_number == 1:
                inbound = [flight for flight in flights if flight.get("direction") == "inbound"]
                candidate_flights = _sort_flights_for_planning(inbound or flights, "inbound" if inbound else None)
                desired_direction = "inbound"
            elif day_number == max_day:
                outbound = [flight for flight in flights if flight.get("direction") == "outbound"]
                candidate_flights = _sort_flights_for_planning(outbound or flights, "outbound" if outbound else None)
                desired_direction = "outbound"

        flight_offer = _find_matching_flight_offer(details, candidate_flights)
        if not flight_offer and _is_flight_like_transport(item):
            flight_offer = (candidate_flights or [None])[0]
        if item.get("type") == "TRANSPORT" and flight_offer:
            per_adult = _to_float(flight_offer.get("price"))
            group_total = per_adult * adults
            details["airline"] = flight_offer.get("airline") or details.get("airline")
            details["flight_number"] = flight_offer.get("flight_number") or details.get("flight_number")
            details["departure_airport"] = flight_offer.get("departure_airport") or details.get("departure_airport")
            details["arrival_airport"] = flight_offer.get("arrival_airport") or details.get("arrival_airport")
            details["departure_time"] = flight_offer.get("departure_time") or details.get("departure_time")
            details["arrival_time"] = flight_offer.get("arrival_time") or details.get("arrival_time")
            details["price_per_adult"] = per_adult
            details["passengers"] = adults
            details["price"] = group_total
            details["estimated_cost"] = group_total
            details["currency"] = flight_offer.get("currency") or currency
            details["booking_link"] = flight_offer.get("id")
            details["direction"] = flight_offer.get("direction") or details.get("direction")
            if flight_offer.get("departure_time"):
                item["start_time"] = flight_offer["departure_time"]
            if flight_offer.get("arrival_time"):
                item["end_time"] = flight_offer["arrival_time"]

    items = _replace_generic_meals(items, destination)
    items = _apply_weather_safety(items, destination, weather_context)
    items = _normalize_generated_schedule(items, max_day)
    items = _enforce_return_flight_is_last(items, max_day)

    non_contingency_total = 0.0
    contingency_item = None
    for item in items:
        details = item.get("activity_details") or {}
        if _is_contingency_item(item):
            contingency_item = contingency_item or item
            continue
        non_contingency_total += _to_float(details.get("estimated_cost"))

    contingency_value = max(min(contingency_cap, budget - non_contingency_total), 0.0)
    if contingency_item:
        details = contingency_item.setdefault("activity_details", {})
        details["name"] = "Contingency Fund"
        details["estimated_cost"] = contingency_value
        details["currency"] = currency
        details["note"] = "Reserve capped at 10% of the total budget."
    elif budget > 0:
        items.append(
            {
                "day_number": 1,
                "start_time": "20:00",
                "end_time": "20:05",
                "type": "OTHER",
                "activity_details": {
                    "name": "Contingency Fund",
                    "address": "",
                    "note": "Reserve capped at 10% of the total budget.",
                    "estimated_cost": contingency_value,
                    "currency": currency,
                },
            }
        )

    items = _improve_budget_utilization(items, budget, currency)

    return items


def _item_identity(item: dict) -> tuple:
    details = item.get("activity_details") or {}
    return (
        item.get("day_number"),
        item.get("start_time"),
        item.get("end_time"),
        item.get("type"),
        details.get("name"),
    )


def _items_changed(previous_items: list[dict], new_items: list[dict]) -> bool:
    if len(previous_items) != len(new_items):
        return True
    previous_by_id = {item.get("id"): item for item in previous_items if item.get("id") is not None}
    for index, new_item in enumerate(new_items):
        old_item = previous_by_id.get(new_item.get("id")) if new_item.get("id") is not None else None
        if old_item is None and index < len(previous_items):
            old_item = previous_items[index]
        if old_item is None or _item_identity(old_item) != _item_identity(new_item):
            return True
    return False


def _item_label(item: dict) -> str:
    details = item.get("activity_details") or {}
    day = item.get("day_number")
    start = item.get("start_time") or "?"
    end = item.get("end_time") or "?"
    name = details.get("name") or "Unnamed activity"
    return f"day {day}, {start}-{end}: {name}"


def _message_is_generic(content: str) -> bool:
    text = _normalize_text(content)
    generic_phrases = (
        "here is your detailed itinerary",
        "enjoy your trip",
        "itinerary has been adjusted",
        "detailed itinerary for a",
    )
    return not text or any(phrase in text for phrase in generic_phrases)


def _extract_modify_scope(user_message: str, existing_items: list[dict] | None = None) -> dict:
    text = _normalize_text(user_message)
    plain_tokens = set(_plain_text(user_message).split())
    scope: dict = {}
    existing_items = existing_items or []

    day_markers = (
        ("day 1", 1), ("day1", 1), ("day one", 1), ("ngày 1", 1), ("ngày1", 1), ("ngay 1", 1), ("ngay1", 1), ("ngày đầu", 1), ("ngay dau", 1), ("đầu tiên", 1), ("dau tien", 1),
        ("day 2", 2), ("day2", 2), ("day two", 2), ("ngày 2", 2), ("ngày2", 2), ("ngay 2", 2), ("ngay2", 2), ("ngày thứ hai", 2), ("ngay thu hai", 2), ("thứ hai", 2), ("thu hai", 2), ("thứ 2", 2), ("thu 2", 2),
        ("day 3", 3), ("day3", 3), ("day three", 3), ("ngày 3", 3), ("ngày3", 3), ("ngay 3", 3), ("ngay3", 3), ("ngày thứ ba", 3), ("ngay thu ba", 3), ("thứ ba", 3), ("thu ba", 3), ("thứ 3", 3), ("thu 3", 3),
    )
    for marker, day in day_markers:
        if marker in text:
            scope["day_number"] = day
            break
    if "day_number" not in scope and any(
        marker in text
        for marker in (
            "last day", "final day", "ngày cuối", "ngay cuoi", "hôm cuối", "hom cuoi",
            "before go on plane", "before the plane", "before plane", "before flight",
            "trước khi bay", "truoc khi bay", "trước chuyến bay", "truoc chuyen bay",
        )
    ):
        day_numbers = [item.get("day_number") for item in existing_items if item.get("day_number")]
        if day_numbers:
            scope["day_number"] = max(day_numbers)

    if any(word in text for word in ("afternoon", "chiều", "chieu")):
        scope["time_window"] = ("12:00", "17:30")
    elif any(word in text for word in ("morning", "sáng", "sang")):
        scope["time_window"] = ("05:00", "11:59")
    elif any(word in text for word in ("evening", "night", "tối", "toi")):
        scope["time_window"] = ("18:00", "23:59")

    if any(word in text for word in ("breakfast", "bữa sáng", "bua sang")):
        scope["type"] = "MEAL"
        scope["time_window"] = ("05:00", "10:30")
    elif any(word in text for word in ("lunch", "bữa trưa", "bua trua")):
        scope["type"] = "MEAL"
        scope["time_window"] = ("11:00", "14:30")
    elif any(word in text for word in ("dinner", "bữa tối", "bua toi")):
        scope["type"] = "MEAL"
        scope["time_window"] = ("17:00", "22:30")
    elif (
        any(word in plain_tokens for word in ("activity", "activities", "place", "attraction", "museum", "choi"))
        or any(phrase in text for phrase in ("hoạt động", "hoat dong", "bảo tàng", "bao tang"))
    ):
        scope["type"] = "ATTRACTION"

    return scope


def _item_in_scope(item: dict, scope: dict) -> bool:
    if scope.get("day_number") and item.get("day_number") != scope["day_number"]:
        return False
    if scope.get("type") and _item_type_value(item) != scope["type"]:
        return False
    if scope.get("time_window"):
        start = _normalize_text(item.get("start_time"))
        window_start, window_end = scope["time_window"]
        if not start or not (window_start <= start <= window_end):
            return False
    return True


def _request_is_replace(user_message: str) -> bool:
    text = _plain_text(user_message)
    return any(word in text.split() for word in ("replace", "change", "swap", "switch", "thay", "doi", "sua"))


def _request_is_add(user_message: str) -> bool:
    text = _plain_text(user_message)
    return any(word in text.split() for word in ("add", "insert", "them"))


def _preferred_replacement_type(user_message: str) -> str | None:
    text = _plain_text(user_message)
    if any(marker in text for marker in ("restaurant", "eat", "food", "meal", "dinner", "lunch", "breakfast", "quan an", "an", "bua")):
        return "MEAL"
    if any(marker in text for marker in ("hotel", "stay", "accommodation", "khach san")):
        return "LODGING"
    if any(marker in text for marker in ("flight", "plane", "transport", "taxi", "bay", "di lai")):
        return "TRANSPORT"
    if any(marker in text for marker in ("place", "activity", "attraction", "museum", "choi", "bao tang")):
        return "ATTRACTION"
    return None


def _item_name_plain(item: dict) -> str:
    return _plain_text((item.get("activity_details") or {}).get("name"))


def _find_named_target_item(previous_items: list[dict], user_message: str, scope: dict) -> dict | None:
    text = _plain_text(user_message)
    candidates = []
    for item in previous_items:
        if scope.get("day_number") and item.get("day_number") != scope["day_number"]:
            continue
        name = _item_name_plain(item)
        if not name:
            continue
        if name in text or all(part in text for part in name.split() if len(part) > 2):
            candidates.append(item)
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: len(_item_name_plain(item)), reverse=True)[0]


def _merge_modify_items(previous_items: list[dict], proposed_items: list[dict], user_message: str) -> list[dict]:
    """For MODIFY_TRIP, preserve the existing itinerary and apply only the requested edit."""
    if not previous_items or not proposed_items:
        return proposed_items

    scope = _extract_modify_scope(user_message, previous_items)
    target_item = _find_named_target_item(previous_items, user_message, scope)
    preferred_type = _preferred_replacement_type(user_message)

    scoped_previous = [item for item in previous_items if _item_in_scope(item, scope)]
    if not target_item and _request_is_replace(user_message) and len(scoped_previous) == 1:
        target_item = scoped_previous[0]

    previous_identities = {_item_identity(item) for item in previous_items}

    if target_item and _request_is_replace(user_message):
        target_id = target_item.get("id")

        def replacement_score(item: dict) -> tuple:
            same_id = 0 if target_id is not None and item.get("id") == target_id else 1
            same_day = 0 if item.get("day_number") == target_item.get("day_number") else 1
            type_match = 0 if preferred_type and _item_type_value(item) == preferred_type else 1
            is_old_unchanged = 1 if _item_identity(item) in previous_identities and item.get("id") != target_id else 0
            return (same_id, same_day, type_match, is_old_unchanged)

        candidates = [
            item for item in proposed_items
            if _item_identity(item) != _item_identity(target_item)
            and not (_item_identity(item) in previous_identities and item.get("id") != target_id)
        ]
        if preferred_type:
            typed_candidates = [item for item in candidates if _item_type_value(item) == preferred_type]
            if typed_candidates:
                candidates = typed_candidates
        if not candidates:
            return previous_items

        replacement = copy.deepcopy(sorted(candidates, key=replacement_score)[0])
        replacement["id"] = target_item.get("id")
        replacement["day_number"] = target_item.get("day_number")
        replacement["start_time"] = target_item.get("start_time")
        replacement["end_time"] = target_item.get("end_time")
        if target_item.get("status") and not replacement.get("status"):
            replacement["status"] = target_item.get("status")

        merged = []
        for item in previous_items:
            merged.append(replacement if item.get("id") == target_item.get("id") else item)
        return merged

    merged_by_id = {item.get("id"): copy.deepcopy(item) for item in previous_items if item.get("id") is not None}
    for item in proposed_items:
        item_id = item.get("id")
        if item_id in merged_by_id and _item_in_scope(merged_by_id[item_id], scope):
            merged_by_id[item_id] = item

    merged = []
    for item in previous_items:
        merged.append(merged_by_id.get(item.get("id"), item))

    if _request_is_add(user_message):
        for item in proposed_items:
            if _item_identity(item) not in previous_identities and _item_in_scope(item, scope):
                merged.append(item)

    return sorted(
        merged,
        key=lambda item: (
            int(item.get("day_number") or 1),
            _time_to_minutes(item.get("start_time")) if _time_to_minutes(item.get("start_time")) is not None else 24 * 60,
            item.get("id") or 0,
        ),
    )


def _build_modify_summary(previous_items: list[dict], new_items: list[dict], user_message: str) -> str | None:
    if not previous_items or not new_items:
        return None

    scope = _extract_modify_scope(user_message, previous_items)
    used_old_keys = set()
    previous_by_slot = {
        (item.get("day_number"), item.get("start_time"), item.get("end_time"), item.get("type")): (idx, item)
        for idx, item in enumerate(previous_items)
    }
    previous_by_id = {
        item.get("id"): (idx, item)
        for idx, item in enumerate(previous_items)
        if item.get("id") is not None
    }
    previous_identities = {_item_identity(item) for item in previous_items}

    def find_old_match(new_item: dict) -> tuple[int, dict] | None:
        if new_item.get("id") in previous_by_id:
            return previous_by_id[new_item.get("id")]

        key = (new_item.get("day_number"), new_item.get("start_time"), new_item.get("end_time"), new_item.get("type"))
        exact = previous_by_slot.get(key)
        if exact:
            return exact

        candidates = [
            (idx, item)
            for idx, item in enumerate(previous_items)
            if idx not in used_old_keys
            and item.get("day_number") == new_item.get("day_number")
            and _item_type_value(item) == _item_type_value(new_item)
            and _item_in_scope(item, scope)
        ]
        if "afternoon" in user_message.lower():
            afternoon_candidates = [
                (idx, item)
                for idx, item in candidates
                if "12:00" <= _normalize_text(item.get("start_time")) <= "17:30"
            ]
            if afternoon_candidates:
                return afternoon_candidates[0]
        return candidates[0] if len(candidates) == 1 else None

    changes = []
    additions = []
    for item in new_items:
        if not _item_in_scope(item, scope):
            continue
        old_match = find_old_match(item)
        if not old_match:
            if _item_identity(item) not in previous_identities:
                additions.append(item)
            continue
        old_idx, old_item = old_match
        if old_idx in used_old_keys:
            continue
        if not old_item:
            continue
        if _item_identity(old_item) != _item_identity(item):
            changes.append((old_item, item))
            used_old_keys.add(old_idx)

    if not changes and not additions:
        return None

    reason = ""
    lowered = user_message.lower()
    if "because" in lowered:
        reason = user_message[user_message.lower().find("because"):].strip().rstrip(".")
    elif "since" in lowered:
        reason = user_message[user_message.lower().find("since"):].strip().rstrip(".")

    lines = ["Updated the itinerary as requested:"]
    for old_item, new_item in changes[:3]:
        suffix = f" {reason}." if reason else "."
        lines.append(f"- Replaced {_item_label(old_item)} with {_item_label(new_item)}{suffix}")

    remaining_slots = max(0, 3 - len(changes))
    for new_item in additions[:remaining_slots]:
        suffix = f" {reason}." if reason else "."
        lines.append(f"- Added {_item_label(new_item)}{suffix}")

    extra_count = max(0, len(changes) + len(additions) - 3)
    if extra_count:
        lines.append(f"- Also adjusted {extra_count} related item(s) to keep the schedule consistent.")

    return "\n".join(lines)


def _restore_out_of_scope_changes(previous_items: list[dict], new_items: list[dict], user_message: str) -> list[dict]:
    scope = _extract_modify_scope(user_message, previous_items)
    if not scope:
        return new_items

    previous_by_id = {item.get("id"): item for item in previous_items if item.get("id") is not None}
    previous_by_slot = {
        (item.get("day_number"), item.get("start_time"), item.get("end_time"), item.get("type")): item
        for item in previous_items
    }

    restored = []
    for item in new_items:
        old_item = previous_by_id.get(item.get("id"))
        if not old_item:
            old_item = previous_by_slot.get((item.get("day_number"), item.get("start_time"), item.get("end_time"), item.get("type")))
        if old_item and not _item_in_scope(old_item, scope) and _item_identity(old_item) != _item_identity(item):
            restored.append(old_item)
        else:
            restored.append(item)
    return restored



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
    budget_value = _to_float(budget)
    contingency_cap = budget_value * 0.10
    budget_floor = budget_value * 0.85
    budget_ceiling = budget_value
    
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
    flight_offers = gds_offers.get("flights", []) or []
    inbound_flights = _sort_flights_for_planning(flight_offers, "inbound")[:5]
    outbound_flights = _sort_flights_for_planning(flight_offers, "outbound")[:5]
    other_flights = _sort_flights_for_planning(
        [flight for flight in flight_offers if flight.get("direction") not in ("inbound", "outbound")]
    )[:5]
    gds_context = (
        "Available Inbound Flights (prefer earlier arrival for more day 1 time):\n"
        f"{json.dumps(inbound_flights, indent=2, ensure_ascii=False)}\n\n"
        "Available Outbound Flights (prefer later departure for more last-day time):\n"
        f"{json.dumps(outbound_flights, indent=2, ensure_ascii=False)}\n\n"
        "Other Available Flights:\n"
        f"{json.dumps(other_flights, indent=2, ensure_ascii=False)}\n\n"
        "Available Hotels:\n"
        f"{json.dumps(gds_offers.get('hotels', [])[:5], indent=2, ensure_ascii=False)}"
    )
    previous_items = state.get("itinerary_items") or []

    prompt = PLAN_PROMPT.format(
        user_message=state["user_message"],
        location=location,
        start_date=start_date,
        end_date=end_date,
        num_days=num_days,
        budget=budget,
        currency=currency,
        adults=adults,
        contingency_cap=contingency_cap,
        budget_floor=budget_floor,
        budget_ceiling=budget_ceiling,
        preferences=", ".join(merged_prefs) if merged_prefs else "None specified",
        search_results=search_summary[:2000] or "No search results available",
        memory_context="\n".join(state.get("memory_context", [])) or "No previous context",
        existing_itinerary=json.dumps(state.get("itinerary_items") or [], ensure_ascii=False, indent=2, default=str) if state.get("itinerary_items") else "None",
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
        normalized_items = _normalize_group_pricing_and_contingency(
            parsed.get("itinerary_items") or [],
            gds_offers,
            adults,
            budget_value,
            currency,
            location,
            state.get("weather_context") or {},
        )
        if state.get("intent") == "MODIFY_TRIP":
            normalized_items = _merge_modify_items(previous_items, normalized_items, state["user_message"])
        state["itinerary_items"] = normalized_items
        messages = parsed.get("messages") or []
        modify_summary = _build_modify_summary(previous_items, state["itinerary_items"], state["user_message"])
        if state.get("intent") == "MODIFY_TRIP" and not _items_changed(previous_items, state["itinerary_items"]):
            state["messages"] = [{
                "role": "assistant",
                "content": "I could not safely apply that change to the itinerary. Please specify the day/time and what to add, replace, or remove.",
            }]
        elif modify_summary:
            state["messages"] = [{"role": "assistant", "content": modify_summary}]
        elif messages:
            state["messages"] = messages
    except json.JSONDecodeError:
        state["messages"] = [
            {
                "role": "assistant",
                "content": "I generated a plan but encountered a formatting issue. Please try again.",
            }
        ]

    return state
