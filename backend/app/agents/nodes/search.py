from app.agents.state import AgentState
from app.agents.tools import get_search_tool


async def search_node(state: AgentState) -> AgentState:
    """Use external search (Tavily) to find place information."""
    entities = state.get("entities", {})
    location = entities.get("location", "")
    intent = state.get("intent", "")
    user_message = state["user_message"]

    tool = get_search_tool()

    queries = []

    if intent == "ASK_INFO":
        # Dùng đúng câu hỏi của user để tìm kiếm – cho kết quả liên quan hơn
        queries.append(user_message[:200])
        if location:
            queries.append(f"{user_message[:100]} in {location}")
    elif location:
        # CREATE_TRIP / MODIFY_TRIP: tìm attractions + nhà hàng theo địa điểm
        queries.append(f"top tourist attractions things to do in {location}")
        queries.append(f"best restaurants food in {location}")
    else:
        queries.append(user_message[:200])

    all_results = []
    for q in queries:
        try:
            results = await tool.search(q)
            all_results.extend(results)
        except Exception as e:
            all_results.append(
                {
                    "type": "placeholder",
                    "message": f"Không tìm thấy thông tin ({str(e)})",
                    "query": q,
                }
            )

    state["search_results"] = all_results[:10]
    return state
