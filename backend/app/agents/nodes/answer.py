from langchain_openai import ChatOpenAI
from app.agents.state import AgentState
from app.core.config import get_settings

settings = get_settings()
llm = ChatOpenAI(
    model=settings.OPENAI_MODEL,
    api_key=settings.OPENAI_API_KEY,
    temperature=0.3,
    max_tokens=512,
)

ANSWER_PROMPT = """You are a helpful travel assistant. Answer the user's question in the same language they used.

User question: {user_message}

Relevant information from web search:
{search_results}

Instructions:
- Answer directly and concisely based on all available information.
- If the search results contain relevant information, use it.
- If the search results are insufficient or unrelated, use your own general knowledge to answer helpfully.
- Do NOT say "I don't have information" if you can answer from general knowledge.
- Do NOT generate a travel itinerary. Just answer the question.
- Be friendly and practical."""


async def answer_node(state: AgentState) -> AgentState:
    """Synthesize search results into a natural-language answer for ASK_INFO intents.

    This node is only reached via the ASK_INFO shortcut path:
    search → answer → finalize (skipping plan + constraint).
    """
    search_summary = "\n".join(
        [r.get("content", r.get("message", ""))[:300] for r in (state.get("search_results") or [])]
    )

    if not search_summary.strip():
        state["messages"] = [
            {
                "role": "assistant",
                "content": "Xin lỗi, tôi không tìm thấy thông tin liên quan. Bạn có thể hỏi lại cụ thể hơn không?",
            }
        ]
        return state

    prompt = ANSWER_PROMPT.format(
        user_message=state["user_message"],
        search_results=search_summary[:2000],
    )

    try:
        response = await llm.ainvoke(prompt)
        state["messages"] = [{"role": "assistant", "content": response.content.strip()}]
    except Exception:
        # Fallback: join raw search content if LLM fails
        state["messages"] = [
            {"role": "assistant", "content": search_summary[:800] or "Không có thông tin."}
        ]

    return state
