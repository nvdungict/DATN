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
Budget: {budget} {currency}
Travel profile / preferences: {preferences}
Search results about the destination: {search_results}
Previous memories / constraints: {memory_context}

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
      "type": "ATTRACTION|MEAL|TRANSPORT|LODGING",
      "activity_details": {{
        "name": "...",
        "address": "...",
        "lat": float,
        "lng": float,
        "note": "...",
        "estimated_cost": float
      }}
    }}
  ],
  "messages": [{{"role": "assistant", "content": "..."}}]
}}

Return ONLY valid JSON."""


async def plan_node(state: AgentState) -> AgentState:
    """Generate or modify a full itinerary using LLM."""
    entities = state.get("entities", {})
    location = entities.get("location") or "Unknown destination"
    budget = entities.get("budget") or 500
    currency = entities.get("currency") or "USD"
    preferences = entities.get("preferences") or []
    start_date = entities.get("start_date") or str(date.today() + timedelta(days=7))
    num_days = int(entities.get("num_days") or 3)
    end_date = entities.get("end_date") or str(
        date.fromisoformat(start_date) + timedelta(days=num_days - 1)
    )

    search_summary = "\n".join(
        [r.get("content", r.get("message", ""))[:300] for r in state.get("search_results", [])]
    )

    prompt = PLAN_PROMPT.format(
        user_message=state["user_message"],
        location=location,
        start_date=start_date,
        end_date=end_date,
        budget=budget,
        currency=currency,
        preferences=", ".join(preferences) if preferences else "None specified",
        search_results=search_summary[:2000] or "No search results available",
        memory_context="\n".join(state.get("memory_context", [])) or "No previous context",
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
        parsed = json.loads(content)
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
