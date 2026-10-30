import asyncio
import sys
from collections.abc import Callable, Coroutine
from typing import Any, TypeVar

T = TypeVar("T")
AsyncOperation = Callable[[], Coroutine[Any, Any, T]]


def run_with_selector_loop(operation: AsyncOperation[T]) -> T:
    return asyncio.run(operation(), loop_factory=asyncio.SelectorEventLoop)


async def run_with_compatible_loop(operation: AsyncOperation[T]) -> T:
    if sys.platform == "win32":
        return await asyncio.to_thread(run_with_selector_loop, operation)
    return await operation()
