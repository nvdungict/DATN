"""Info Agent subgraph — handles ASK_INFO intent (fast Q&A path)."""
import functools

from langgraph.graph import StateGraph, END
from sqlmodel.ext.asyncio.session import AsyncSession

from app.agents.state import AgentState
from app.agents.nodes.search import search_node
from app.agents.nodes.answer import answer_node
from app.agents.nodes.finalize import finalize_node
from app.agents.timing import timed_node


def build_info_graph(session: AsyncSession) -> StateGraph:
    """Build the Info Agent subgraph for travel Q&A."""
    _finalize = functools.partial(finalize_node, session=session)

    graph = StateGraph(AgentState)

    graph.add_node("search", timed_node("info.search", search_node))
    graph.add_node("answer", timed_node("answer", answer_node))
    graph.add_node("finalize", timed_node("info.finalize", _finalize))

    graph.set_entry_point("search")

    graph.add_edge("search", "answer")
    graph.add_edge("answer", "finalize")
    graph.add_edge("finalize", END)

    return graph
