from datetime import datetime, time
from app.agents.state import AgentState


def _parse_time(t: str | None) -> time | None:
    if not t:
        return None
    try:
        return time.fromisoformat(t)
    except ValueError:
        return None


def _times_overlap(
    start1: time | None,
    end1: time | None,
    start2: time | None,
    end2: time | None,
) -> bool:
    if not all([start1, end1, start2, end2]):
        return False
    return not (end1 <= start2 or end2 <= start1)


async def constraint_node(state: AgentState) -> AgentState:
    """Check itinerary for constraint violations: time overlaps and budget."""
    items = state.get("itinerary_items", [])
    trip = state.get("trip_data") or state.get("existing_trip") or {}
    total_budget = float(trip.get("total_budget") or float("inf"))
    conflicts: list[dict] = []

    # Group by day
    days: dict[int, list[dict]] = {}
    for item in items:
        day = item.get("day_number", 1)
        days.setdefault(day, []).append(item)

    # Check time overlap within each day
    for day, day_items in days.items():
        sorted_items = sorted(
            day_items,
            key=lambda x: _parse_time(x.get("start_time")) or time.min,
        )
        for i in range(len(sorted_items) - 1):
            a = sorted_items[i]
            b = sorted_items[i + 1]
            if _times_overlap(
                _parse_time(a.get("start_time")),
                _parse_time(a.get("end_time")),
                _parse_time(b.get("start_time")),
                _parse_time(b.get("end_time")),
            ):
                conflicts.append(
                    {
                        "type": "TIME_OVERLAP",
                        "day": day,
                        "item_a": a.get("activity_details", {}).get("name", "Item A"),
                        "item_b": b.get("activity_details", {}).get("name", "Item B"),
                        "message": f"Day {day}: Time overlap detected between activities",
                    }
                )

    # Check budget
    total_cost = sum(
        float(item.get("activity_details", {}).get("estimated_cost", 0))
        for item in items
    )
    if total_budget and total_cost > total_budget:
        conflicts.append(
            {
                "type": "BUDGET_EXCEEDED",
                "estimated_total": total_cost,
                "budget": total_budget,
                "message": f"Estimated cost ${total_cost:.0f} exceeds budget ${total_budget:.0f}",
            }
        )

    state["conflicts"] = conflicts
    return state
