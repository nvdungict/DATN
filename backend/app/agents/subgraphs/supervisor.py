"""Supervisor node — routes to the correct specialized agent subgraph."""
from app.agents.state import AgentState


def supervisor_node(state: AgentState) -> AgentState:
    """Set agent_type based on intent for conditional routing."""
    intent = state.get("intent", "ASK_INFO")

    if intent in ("CREATE_TRIP", "MODIFY_TRIP"):
        state["agent_type"] = "planning"
    elif intent in ("SEARCH_FLIGHT", "SEARCH_HOTEL"):
        state["agent_type"] = "booking"
    else:  # ASK_INFO or unknown
        state["agent_type"] = "info"

    return state


def route_after_supervisor(state: AgentState) -> str:
    """LangGraph conditional edge function for supervisor → subgraph routing."""
    return state.get("agent_type", "info")
