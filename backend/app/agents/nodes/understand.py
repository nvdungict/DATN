import json
from langchain_openai import ChatOpenAI
from app.agents.state import AgentState
from app.core.config import get_settings

settings = get_settings()
llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)


UNDERSTAND_PROMPT = """You are a travel assistant. Analyze the user's message and extract structured information.

User message: {message}

IMPORTANT RULES for intent classification:
- If the user mentions a destination AND wants to travel / plan / go there → "CREATE_TRIP"
- If the user wants to change / update / modify an existing plan → "MODIFY_TRIP"
- If the user is only asking a question without wanting to create a plan → "ASK_INFO"
- Short messages like "du lich Ha Noi", "đi Đà Nẵng", "trip to Paris" → always "CREATE_TRIP"
- When in doubt between CREATE_TRIP and ASK_INFO, prefer "CREATE_TRIP"

Return a JSON object with exactly these keys:
- intent: one of "CREATE_TRIP", "MODIFY_TRIP", "ASK_INFO"
- entities: object with:
  - location: string (city/country extracted, or null)
  - start_date: string ISO date or null
  - end_date: string ISO date or null
  - num_days: integer (default 3 if not specified)
  - budget: float or null
  - currency: string (default "USD") or null
  - preferences: list of strings (dietary, interests, etc.)
  - constraints: list of strings

Return ONLY valid JSON, no explanation, no markdown."""


async def understand_node(state: AgentState) -> AgentState:
    prompt = UNDERSTAND_PROMPT.format(message=state["user_message"])
    response = await llm.ainvoke(prompt)

    content = response.content.strip()
    # Strip markdown fences if any
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        # Fallback: if message has location-like keywords, treat as CREATE_TRIP
        parsed = {
            "intent": "CREATE_TRIP",
            "entities": {"location": state["user_message"], "num_days": 3, "preferences": [], "constraints": []},
        }

    state["intent"] = parsed.get("intent", "CREATE_TRIP")
    state["entities"] = parsed.get("entities", {})

    # Ensure num_days has a default
    if not state["entities"].get("num_days"):
        state["entities"]["num_days"] = 3

    return state
