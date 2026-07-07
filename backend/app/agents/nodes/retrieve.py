from sqlmodel.ext.asyncio.session import AsyncSession
from app.agents.state import AgentState
from app.services.memory_service import retrieve_memory


async def retrieve_node(state: AgentState, session: AsyncSession) -> AgentState:
    """Retrieve current trip data and relevant memories from the DB."""
    user_id = state["user_id"]
    trip_id = state.get("trip_id")

    # Retrieve user profile
    from app.models.user import User
    from sqlmodel import select
    user_result = await session.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user and user.travel_profile:
        state["user_profile"] = user.travel_profile

    # Retrieve trip
    if trip_id:
        from app.models.trip import Trip
        from app.models.itinerary import ItineraryItem
        from sqlmodel import select

        trip_result = await session.execute(
            select(Trip).where(Trip.id == trip_id, Trip.user_id == user_id)
        )
        trip = trip_result.scalar_one_or_none()
        if trip:
            state["existing_trip"] = trip.model_dump()

            items_result = await session.execute(
                select(ItineraryItem)
                .where(ItineraryItem.trip_id == trip_id)
                .order_by(ItineraryItem.day_number, ItineraryItem.start_time)
            )
            items = items_result.scalars().all()
            state["itinerary_items"] = [i.model_dump() for i in items]

    # Retrieve relevant memories via vector search
    query = state["user_message"]
    memories = await retrieve_memory(session, user_id, query, top_k=5, trip_id=trip_id)
    state["memory_context"] = [m.content for m, _ in memories]

    return state
