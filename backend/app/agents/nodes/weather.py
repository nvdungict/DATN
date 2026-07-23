from datetime import date, timedelta
from typing import Any

from app.agents.state import AgentState
from app.services.weather_service import WeatherAPIClient


def _coerce_date(value: Any) -> str | None:
    if not value:
        return None
    if isinstance(value, date):
        return value.isoformat()
    return str(value)[:10]


def _fallback_dates(state: AgentState) -> tuple[str, str]:
    entities = state.get("entities") or {}
    existing_trip = state.get("existing_trip") or {}

    start_date = _coerce_date(entities.get("start_date") or existing_trip.get("start_date"))
    num_days = int(entities.get("num_days") or 3)
    if not start_date:
        start_date = (date.today() + timedelta(days=7)).isoformat()

    end_date = _coerce_date(entities.get("end_date") or existing_trip.get("end_date"))
    if not end_date:
        try:
            end_date = (date.fromisoformat(start_date) + timedelta(days=num_days - 1)).isoformat()
        except Exception:
            end_date = start_date

    return start_date, end_date


def _summarize_weather(weather: dict[str, Any]) -> str:
    if not weather.get("configured"):
        return "WeatherAPI is not configured. Plan normally, but mention that live weather-aware optimization is unavailable."

    if weather.get("unavailable"):
        advice = "; ".join(weather.get("advice") or [])
        return f"Weather forecast unavailable for the trip dates. {advice}".strip()

    lines = [
        f"Weather coverage: {weather.get('coverage_note') or 'Forecast available for trip dates.'}",
        f"Location: {weather.get('location') or 'Unknown'}",
    ]

    for day in weather.get("days", [])[:14]:
        rain = day.get("chance_of_rain")
        try:
            rain_value = float(rain)
        except (TypeError, ValueError):
            rain_label = "unknown rain risk"
        else:
            if rain_value < 40:
                rain_label = "low rain risk; outdoor plans are acceptable"
            elif rain_value < 75:
                rain_label = "moderate rain risk; keep outdoor plans with backups"
            else:
                rain_label = "very high rain risk; prefer indoor alternatives"
        lines.append(
            "- {date}: {condition}, {min_temp}-{max_temp}C, rain {rain}% ({rain_label}), UV {uv}, wind {wind} km/h".format(
                date=day.get("date"),
                condition=day.get("condition") or "Unknown",
                min_temp=round(day.get("min_temp_c")) if day.get("min_temp_c") is not None else "?",
                max_temp=round(day.get("max_temp_c")) if day.get("max_temp_c") is not None else "?",
                rain=rain if rain is not None else "?",
                rain_label=rain_label,
                uv=day.get("uv") if day.get("uv") is not None else "?",
                wind=day.get("max_wind_kph") if day.get("max_wind_kph") is not None else "?",
            )
        )

    if weather.get("alerts"):
        alert = weather["alerts"][0]
        lines.append(f"Weather alert: {alert.get('event') or alert.get('headline') or 'Review local warnings.'}")

    for advice in weather.get("advice") or []:
        lines.append(f"Planning advice: {advice}")

    return "\n".join(lines)


async def weather_context_node(state: AgentState) -> AgentState:
    """Fetch trip-date weather and make it available to the planner prompt."""
    entities = state.get("entities") or {}
    existing_trip = state.get("existing_trip") or {}
    destination = entities.get("location") or existing_trip.get("destination")

    if not destination:
        state["weather_context"] = {
            "available": False,
            "summary": "No destination was extracted, so weather-aware optimization is unavailable.",
        }
        return state

    start_date, end_date = _fallback_dates(state)
    try:
        weather = await WeatherAPIClient().get_weather_for_plan(
            destination=destination,
            start_date=start_date,
            end_date=end_date,
            itinerary_items=[],
        )
        state["weather_context"] = {
            "available": bool(weather.get("configured")) and not bool(weather.get("unavailable")),
            "raw": weather,
            "summary": _summarize_weather(weather),
        }
    except Exception as exc:
        state["weather_context"] = {
            "available": False,
            "summary": f"Weather lookup failed, plan normally without weather optimization. Error: {exc}",
        }

    return state
