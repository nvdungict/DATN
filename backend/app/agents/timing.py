import inspect
import time
from collections.abc import Callable
from typing import Any


def timed_node(name: str, fn: Callable[..., Any]) -> Callable[..., Any]:
    """Wrap a LangGraph node and print elapsed time for performance tracing."""
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        start = time.perf_counter()
        try:
            result = fn(*args, **kwargs)
            if inspect.isawaitable(result):
                return await result
            return result
        finally:
            elapsed = time.perf_counter() - start
            print(f"[agent timing] {name}: {elapsed:.2f}s")

    return wrapper
