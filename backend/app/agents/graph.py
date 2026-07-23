"""
Main agent entry point — Supervisor Graph.

Architecture:
    understand → supervisor → [planning | info | booking]

Intents:
    CREATE_TRIP / MODIFY_TRIP  → Planning Agent (subgraph)
    ASK_INFO                   → Info Agent (subgraph)
    SEARCH_FLIGHT / SEARCH_HOTEL → Booking Agent (subgraph)
"""
import functools
import time
from typing import AsyncGenerator

from langgraph.graph import StateGraph, END
from sqlmodel.ext.asyncio.session import AsyncSession

from app.agents.state import AgentState
from app.agents.nodes.understand import understand_node
from app.agents.subgraphs.supervisor import supervisor_node, route_after_supervisor
from app.agents.subgraphs.planning import build_planning_graph
from app.agents.subgraphs.info import build_info_graph
from app.agents.subgraphs.booking import build_booking_graph
from app.agents.timing import timed_node


# ---------------------------------------------------------------------------
# Build graph
# ---------------------------------------------------------------------------

def build_graph(session: AsyncSession) -> StateGraph:
    """Build the Supervisor graph with specialized agent subgraphs."""
    planning = build_planning_graph(session).compile()
    info = build_info_graph(session).compile()
    booking = build_booking_graph().compile()

    graph = StateGraph(AgentState)

    graph.add_node("understand", timed_node("understand", understand_node))
    graph.add_node("supervisor", timed_node("supervisor", supervisor_node))
    graph.add_node("planning", planning)
    graph.add_node("info", info)
    graph.add_node("booking", booking)

    graph.set_entry_point("understand")
    graph.add_edge("understand", "supervisor")

    graph.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {"planning": "planning", "info": "info", "booking": "booking"},
    )

    graph.add_edge("planning", END)
    graph.add_edge("info", END)
    graph.add_edge("booking", END)

    return graph


# ---------------------------------------------------------------------------
# Run helpers (signatures unchanged — frontend/WebSocket not affected)
# ---------------------------------------------------------------------------

async def run_agent(
    user_message: str,
    user_id: int,
    session: AsyncSession,
    trip_id: int | None = None,
) -> dict:
    """Run the agent graph and return the final state."""
    start = time.perf_counter()
    graph = build_graph(session)
    compiled = graph.compile()

    initial_state: AgentState = _make_initial_state(user_message, user_id, trip_id)
    final_state = await compiled.ainvoke(initial_state)
    print(f"[agent timing] run_agent_total: {time.perf_counter() - start:.2f}s")

    return {
        "action": final_state.get("intent") or "ASK_INFO",
        "trip": final_state.get("trip_data"),
        "itinerary_items": final_state.get("itinerary_items") or [],
        "conflicts": final_state.get("conflicts") or [],
        "messages": final_state.get("messages") or [],
        "booking_results": final_state.get("booking_results") or [],
    }


async def run_agent_streaming(
    user_message: str,
    user_id: int,
    session: AsyncSession,
    trip_id: int | None = None,
) -> AsyncGenerator[dict, None]:
    """Stream agent execution chunks for WebSocket real-time output."""
    start = time.perf_counter()
    graph = build_graph(session)
    compiled = graph.compile()

    initial_state: AgentState = _make_initial_state(user_message, user_id, trip_id)

    FINALIZE_NODES = {"planning", "info", "booking"}

    async for event in compiled.astream(initial_state):
        for node_name, node_output in event.items():
            if node_name == "understand":
                yield {
                    "type": "token",
                    "content": "🔍 Understanding your request...",
                    "metadata": {"node": "understand"},
                }
            elif node_name == "supervisor":
                agent_type = node_output.get("agent_type")
                if agent_type == "planning":
                    yield {
                        "type": "token",
                        "content": "📅 Creating your personalized itinerary...",
                        "metadata": {"node": "planning"},
                    }
                elif agent_type == "booking":
                    yield {
                        "type": "token",
                        "content": "✈️ Searching for available options...",
                        "metadata": {"node": "booking"},
                    }
                elif agent_type == "info":
                    yield {
                        "type": "token",
                        "content": "💬 Thinking about your question...",
                        "metadata": {"node": "info"},
                    }
            elif node_name in FINALIZE_NODES:
                messages = node_output.get("messages") or []
                print(f"[agent timing] run_agent_streaming_total: {time.perf_counter() - start:.2f}s")
                yield {
                    "type": "final",
                    "content": messages[0]["content"] if messages else "Done!",
                    "metadata": {
                        "action": node_output.get("intent"),
                        "trip": node_output.get("trip_data"),
                        "itinerary_items": node_output.get("itinerary_items") or [],
                        "conflicts": node_output.get("conflicts") or [],
                        "booking_results": node_output.get("booking_results") or [],
                    },
                }


def _make_initial_state(user_message: str, user_id: int, trip_id: int | None) -> AgentState:
    return {
        "user_message": user_message,
        "user_id": user_id,
        "trip_id": trip_id,
        "intent": "",
        "entities": {},
        "existing_trip": None,
        "user_profile": None,
        "memory_context": [],
        "search_results": [],
        "trip_data": None,
        "itinerary_items": [],
        "conflicts": [],
        "messages": [],
        "next_node": "",
        "agent_type": "",
        "booking_params": {},
        "booking_results": [],
        "weather_context": {},
    }
