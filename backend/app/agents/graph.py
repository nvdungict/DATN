import functools
from typing import AsyncGenerator

from langgraph.graph import StateGraph, END
from sqlmodel.ext.asyncio.session import AsyncSession

from app.agents.state import AgentState
from app.agents.nodes.understand import understand_node
from app.agents.nodes.decision import decision_node, route_after_decision
from app.agents.nodes.retrieve import retrieve_node
from app.agents.nodes.search import search_node
from app.agents.nodes.plan import plan_node
from app.agents.nodes.constraint import constraint_node
from app.agents.nodes.finalize import finalize_node
from app.agents.nodes.answer import answer_node


def build_graph(session: AsyncSession) -> StateGraph:
    """Build the LangGraph StateGraph, binding session-dependent nodes."""

    # Bind session to nodes that need DB access
    _retrieve = functools.partial(retrieve_node, session=session)
    _finalize = functools.partial(finalize_node, session=session)

    graph = StateGraph(AgentState)

    graph.add_node("understand", understand_node)
    graph.add_node("decision", decision_node)
    graph.add_node("retrieve", _retrieve)
    graph.add_node("search", search_node)
    graph.add_node("answer", answer_node)   # ASK_INFO shortcut node
    graph.add_node("plan", plan_node)
    graph.add_node("constraint", constraint_node)
    graph.add_node("finalize", _finalize)

    # Entry
    graph.set_entry_point("understand")

    # understand → decision
    graph.add_edge("understand", "decision")

    # decision → conditional branch
    graph.add_conditional_edges(
        "decision",
        route_after_decision,
        {
            "plan": "search",        # CREATE: search first then plan
            "retrieve": "retrieve",  # MODIFY: retrieve then plan
            "search": "search",      # ASK_INFO: search only
        },
    )

    # retrieve → plan (for MODIFY_TRIP)
    graph.add_edge("retrieve", "plan")

    # search → conditional: ASK_INFO shortcut skips plan + constraint
    def route_after_search(state: AgentState) -> str:
        """ASK_INFO → answer (skip plan+constraint). Others → plan."""
        return "answer" if state.get("intent") == "ASK_INFO" else "plan"

    graph.add_conditional_edges(
        "search",
        route_after_search,
        {"answer": "answer", "plan": "plan"},
    )

    # answer → finalize (ASK_INFO fast path, bypass constraint)
    graph.add_edge("answer", "finalize")

    # plan → constraint → finalize
    graph.add_edge("plan", "constraint")
    graph.add_edge("constraint", "finalize")

    # finalize → END
    graph.add_edge("finalize", END)

    return graph


async def run_agent(
    user_message: str,
    user_id: int,
    session: AsyncSession,
    trip_id: int | None = None,
) -> dict:
    """Run the agent graph synchronously and return the final state."""
    graph = build_graph(session)
    compiled = graph.compile()

    initial_state: AgentState = {
        "user_message": user_message,
        "user_id": user_id,
        "trip_id": trip_id,
        "intent": "",
        "entities": {},
        "existing_trip": None,
        "memory_context": [],
        "search_results": [],
        "trip_data": None,
        "itinerary_items": [],
        "conflicts": [],
        "messages": [],
        "next_node": "",
    }

    final_state = await compiled.ainvoke(initial_state)

    return {
        "action": final_state.get("intent", "ASK_INFO"),
        "trip": final_state.get("trip_data"),
        "itinerary_items": final_state.get("itinerary_items", []),
        "conflicts": final_state.get("conflicts", []),
        "messages": final_state.get("messages", []),
    }


async def run_agent_streaming(
    user_message: str,
    user_id: int,
    session: AsyncSession,
    trip_id: int | None = None,
) -> AsyncGenerator[dict, None]:
    """Stream agent execution chunks for WebSocket real-time output."""
    graph = build_graph(session)
    compiled = graph.compile()

    initial_state: AgentState = {
        "user_message": user_message,
        "user_id": user_id,
        "trip_id": trip_id,
        "intent": "",
        "entities": {},
        "existing_trip": None,
        "memory_context": [],
        "search_results": [],
        "trip_data": None,
        "itinerary_items": [],
        "conflicts": [],
        "messages": [],
        "next_node": "",
    }

    final_state = None
    async for event in compiled.astream(initial_state):
        for node_name, node_output in event.items():
            if node_name == "understand":
                yield {
                    "type": "token",
                    "content": f"🔍 Understanding your request...",
                    "metadata": {"node": node_name},
                }
            elif node_name == "search":
                yield {
                    "type": "token",
                    "content": f"🌐 Searching for places and activities...",
                    "metadata": {"node": node_name},
                }
            elif node_name == "plan":
                yield {
                    "type": "token",
                    "content": f"📅 Creating your personalized itinerary...",
                    "metadata": {"node": node_name},
                }
            elif node_name == "answer":
                yield {
                    "type": "token",
                    "content": "💬 Thinking about your question...",
                    "metadata": {"node": node_name},
                }
            elif node_name == "finalize":
                final_state = node_output
                messages = node_output.get("messages", [])
                yield {
                    "type": "final",
                    "content": messages[0]["content"] if messages else "Done!",
                    "metadata": {
                        "action": node_output.get("intent"),
                        "trip": node_output.get("trip_data"),
                        "itinerary_items": node_output.get("itinerary_items", []),
                        "conflicts": node_output.get("conflicts", []),
                    },
                }
