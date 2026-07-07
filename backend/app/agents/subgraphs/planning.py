"""Planning Agent subgraph — handles CREATE_TRIP and MODIFY_TRIP intents."""
import functools

from langgraph.graph import StateGraph, END
from sqlmodel.ext.asyncio.session import AsyncSession

from app.agents.state import AgentState
from app.agents.nodes.retrieve import retrieve_node
from app.agents.nodes.search import search_node
from app.agents.nodes.weather import weather_context_node
from app.agents.nodes.plan import plan_node
from app.agents.nodes.constraint import constraint_node
from app.agents.nodes.finalize import finalize_node


def planning_entry_node(state: AgentState) -> AgentState:
    """Pass-through node: actual routing is done via conditional edge."""
    return state


def route_planning_entry(state: AgentState) -> str:
    """CREATE_TRIP starts at search; MODIFY_TRIP starts at retrieve."""
    return "search" if state.get("intent") == "CREATE_TRIP" else "retrieve"


def build_planning_graph(session: AsyncSession) -> StateGraph:
    """Build the Planning Agent subgraph."""
    _retrieve = functools.partial(retrieve_node, session=session)
    _finalize = functools.partial(finalize_node, session=session)

    graph = StateGraph(AgentState)

    graph.add_node("planning_entry", planning_entry_node)
    graph.add_node("retrieve", _retrieve)
    graph.add_node("search", search_node)
    graph.add_node("weather_context", weather_context_node)
    graph.add_node("plan", plan_node)
    graph.add_node("constraint", constraint_node)
    graph.add_node("finalize", _finalize)

    graph.set_entry_point("planning_entry")

    # Entry routing: CREATE → search, MODIFY → retrieve
    graph.add_conditional_edges(
        "planning_entry",
        route_planning_entry,
        {"search": "search", "retrieve": "retrieve"},
    )

    # retrieve/search → weather_context → plan
    graph.add_edge("retrieve", "weather_context")

    graph.add_edge("search", "weather_context")
    graph.add_edge("weather_context", "plan")

    # plan → constraint → finalize
    graph.add_edge("plan", "constraint")
    graph.add_edge("constraint", "finalize")
    graph.add_edge("finalize", END)

    return graph
