from sqlmodel.ext.asyncio.session import AsyncSession
from app.agents.state import AgentState
from app.services.trip_service import TripService
from app.services.memory_service import save_memory
from app.models.trip import TripCreate
from app.models.itinerary import ItineraryItemCreate, ItemType
from datetime import date, time as dt_time


def _parse_date(d: str | None) -> date | None:
    if not d:
        return None
    try:
        return date.fromisoformat(d)
    except (ValueError, TypeError):
        return None


def _parse_time(t: str | None) -> dt_time | None:
    if not t:
        return None
    try:
        return dt_time.fromisoformat(t[:5])  # "HH:MM"
    except (ValueError, TypeError):
        return None


async def finalize_node(state: AgentState, session: AsyncSession) -> AgentState:
    """Persist trip + itinerary to DB, save memory, build final response."""
    intent = state.get("intent") or "ASK_INFO"
    svc = TripService(session)
    user_id = state["user_id"]

    saved_trip = None
    saved_items = []

    if intent in ("CREATE_TRIP", "MODIFY_TRIP") and state.get("trip_data"):
        trip_data = state["trip_data"]

        if intent == "CREATE_TRIP":
            trip_create = TripCreate(
                title=trip_data.get("title") or "My Trip",
                destination=trip_data.get("destination") or "",
                start_date=_parse_date(trip_data.get("start_date")) or date.today(),
                end_date=_parse_date(trip_data.get("end_date")) or date.today(),
                total_budget=float(trip_data.get("total_budget") or 0),
                currency=trip_data.get("currency") or "USD",
            )
            saved_trip = await svc.create_trip(trip_create, user_id)
            # ✅ Write DB-generated ID back into state so frontend can redirect
            state["trip_data"] = {**trip_data, "id": saved_trip.id}
        else:
            # MODIFY_TRIP: update existing
            trip_id = state.get("trip_id")
            if trip_id:
                existing = await svc.get_trip(trip_id, user_id)
                if existing:
                    saved_trip = existing
                    state["trip_data"] = {**trip_data, "id": trip_id}

        # --- Geocode addresses using Nominatim before saving ---
        items_to_save = state.get("itinerary_items") or []
        if items_to_save:
            import asyncio
            from geopy.geocoders import Nominatim
            
            # Init geolocator (must define custom user_agent)
            geolocator = Nominatim(user_agent="datn_travel_planner_bot")
            
            for item in items_to_save:
                if not item or item.get("type") in ("TRANSPORT", "OTHER"):
                    continue
                details = item.get("activity_details", {})
                
                # If LLM already gave coordinates, maybe trust them? Actually LLM hallucinates them.
                # So we overwrite them based on the address or name.
                search_query = details.get("address") or details.get("name")
                if not search_query:
                    continue
                
                try:
                    # Run blocking geopy call in a thread
                    location = await asyncio.to_thread(geolocator.geocode, search_query, timeout=5)
                    if location:
                        details["lat"] = location.latitude
                        details["lng"] = location.longitude
                        print(f"Geocoded: {search_query} -> {location.latitude}, {location.longitude}")
                    else:
                        print(f"Could not geocode: {search_query}")
                except Exception as e:
                    print(f"Geocoding error for {search_query}: {e}")
                
                # Sleep to respect Nominatim's strict 1 request/sec limit
                await asyncio.sleep(1.1)

        # Save itinerary items for MODIFY_TRIP
        if saved_trip and intent == "MODIFY_TRIP":
            trip_id = state.get("trip_id")
            if trip_id:
                await svc.update_itinerary_items(
                    trip_id, items_to_save
                )

        # Save itinerary items for CREATE_TRIP
        if saved_trip and intent == "CREATE_TRIP":
            trip_id = saved_trip.id
            for item_dict in items_to_save:
                if not item_dict:
                    continue
                try:
                    item_create = ItineraryItemCreate(
                        trip_id=trip_id,
                        day_number=item_dict.get("day_number", 1),
                        start_time=_parse_time(item_dict.get("start_time")),
                        end_time=_parse_time(item_dict.get("end_time")),
                        type=ItemType(item_dict.get("type", "ATTRACTION")),
                        activity_details=item_dict.get("activity_details", {}),
                    )
                    from app.models.itinerary import ItineraryItem
                    db_item = ItineraryItem(**item_create.model_dump())
                    session.add(db_item)
                    saved_items.append(db_item)
                except Exception:
                    pass
            await session.commit()

        # Save memory of this interaction
        try:
            await save_memory(
                session=session,
                user_id=user_id,
                content=f"User requested: {state['user_message']}",
                memory_type="history",
                trip_id=saved_trip.id if saved_trip and hasattr(saved_trip, "id") else None,
            )
        except Exception:
            pass  # Memory save is non-critical


    # Build messages if empty (answer_node already fills messages for ASK_INFO)
    if not state.get("messages"):
        if state.get("conflicts"):
            conflict_msgs = "; ".join([c["message"] for c in state["conflicts"]])
            state["messages"] = [
                {
                    "role": "assistant",
                    "content": f"Plan created with some conflicts: {conflict_msgs}",
                }
            ]
        else:
            state["messages"] = [
                {"role": "assistant", "content": "Your trip has been planned successfully! 🎉"}
            ]

    return state
