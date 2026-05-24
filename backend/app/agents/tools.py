from typing import Protocol, runtime_checkable


@runtime_checkable
class SearchTool(Protocol):
    async def search(self, query: str) -> list[dict]:
        ...


class TavilySearchTool:
    """Tavily-powered search for real-world place information."""

    def __init__(self, api_key: str):
        from tavily import TavilyClient
        self._client = TavilyClient(api_key=api_key)

    async def search(self, query: str) -> list[dict]:
        import asyncio

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            lambda: self._client.search(
                query=query,
                search_depth="advanced",
                max_results=5,
                include_answer=True,
            ),
        )
        return results.get("results", [])


class MockSearchTool:
    """Fallback search tool when Tavily is not configured."""

    async def search(self, query: str) -> list[dict]:
        return [
            {
                "title": f"Result for: {query}",
                "url": "https://example.com",
                "content": "Place information not available. Please fill in manually.",
            }
        ]


def get_search_tool() -> SearchTool:
    from app.core.config import get_settings

    settings = get_settings()
    if settings.TAVILY_API_KEY:
        return TavilySearchTool(api_key=settings.TAVILY_API_KEY)
    return MockSearchTool()
