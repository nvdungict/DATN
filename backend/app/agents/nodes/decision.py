from app.agents.state import AgentState


def decision_node(state: AgentState) -> AgentState:
    """Pure routing node: sets next_node based on intent."""
    intent = state.get("intent") or "ASK_INFO"
    trip_id = state.get("trip_id")

    if intent == "CREATE_TRIP" and not trip_id:
        state["next_node"] = "plan"
    elif intent == "MODIFY_TRIP" or (intent == "CREATE_TRIP" and trip_id):
        state["next_node"] = "retrieve"
    elif intent == "ASK_INFO" and trip_id:
        # Has trip context: retrieve trip data first, then search with enriched query
        state["next_node"] = "retrieve"
    elif intent == "ASK_INFO":
        state["next_node"] = "search"
    else:
        state["next_node"] = "search"

    return state


def route_after_decision(state: AgentState) -> str:
    """LangGraph conditional edge function."""
    return state.get("next_node") or "search"
