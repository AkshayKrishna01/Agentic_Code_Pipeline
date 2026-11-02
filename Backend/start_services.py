"""Start and supervise the backend and its private MCP services."""

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path
from typing import Any

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

LOG = logging.getLogger("codepilot.supervisor")
WORKSPACE = Path(os.getenv("PYLINT_WORKSPACE", "/tmp/code-pipeline-review"))
DUCK_URL = os.getenv("DUCK_DUCK_GO", "http://127.0.0.1:8000/mcp")
PYLINT_URL = os.getenv(
    "PYLINT_MCP_SERVER_URL", "http://127.0.0.1:8001/mcp"
)
PORT = os.getenv("PORT", "8080")


async def wait_for_mcp(url: str, service_name: str, required: bool) -> bool:
    """Complete an MCP handshake and list tools before declaring readiness."""
    for attempt in range(1, 13):
        try:
            async with streamablehttp_client(
                url, timeout=5, sse_read_timeout=10
            ) as (read_stream, write_stream, _):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    result = await session.list_tools()
                    LOG.info(
                        "%s MCP ready with %d tools",
                        service_name,
                        len(result.tools),
                    )
                    return True
        except Exception as exc:
            LOG.warning(
                "%s MCP readiness attempt %d/12 failed: %s",
                service_name,
                attempt,
                exc,
            )
            await asyncio.sleep(2)

    if required:
        raise RuntimeError(f"{service_name} MCP did not pass MCP readiness")
    LOG.error("%s MCP unavailable; research will remain unavailable", service_name)
    return False


async def start_process(command: list[str], cwd: Path | None = None) -> asyncio.subprocess.Process:
    """Start a child process."""
    return await asyncio.create_subprocess_exec(
        *command,
        cwd=str(cwd) if cwd else None,
        stdout=None,
        stderr=None,
    )


async def start_duckduckgo() -> asyncio.subprocess.Process | None:
    """Start DuckDuckGo without making it a startup-critical dependency."""
    try:
        return await start_process(
            [
                "uvx",
                "duckduckgo-mcp-server",
                "--transport",
                "streamable-http",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ]
        )
    except Exception as exc:
        LOG.error("Unable to start DuckDuckGo MCP: %s", exc)
        return None


async def stop_process(process: asyncio.subprocess.Process | None) -> None:
    """Gracefully stop a child process and force it down if necessary."""
    if process is None or process.returncode is not None:
        return
    process.terminate()
    try:
        await asyncio.wait_for(process.wait(), timeout=10)
    except asyncio.TimeoutError:
        process.kill()
        await process.wait()


async def run() -> int:
    """Run the supervised services until shutdown or a critical failure."""
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    processes: dict[str, asyncio.subprocess.Process | None] = {}
    shutdown_event = asyncio.Event()
    duck_restarts = 0

    def request_shutdown(_: int, __: Any) -> None:
        LOG.info("Shutdown signal received")
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    for signum in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(signum, request_shutdown, signum, None)

    try:
        processes["pylint"] = await start_process(
            ["/app/pylint-mcp/.venv/bin/python", "src/main.py"],
            Path("/app/pylint-mcp"),
        )
        await wait_for_mcp(PYLINT_URL, "Pylint", required=True)

        processes["duckduckgo"] = await start_duckduckgo()
        if processes["duckduckgo"] is not None:
            await wait_for_mcp(DUCK_URL, "DuckDuckGo", required=False)
        else:
            LOG.error("DuckDuckGo MCP unavailable; research will remain unavailable")

        processes["api"] = await start_process(
            [
                "/app/backend/.venv/bin/uvicorn",
                "src.main:app",
                "--host",
                "0.0.0.0",
                "--port",
                PORT,
            ],
            Path("/app/backend"),
        )

        while not shutdown_event.is_set():
            await asyncio.sleep(1)
            pylint = processes["pylint"]
            api = processes["api"]
            if pylint.returncode is not None:
                raise RuntimeError(
                    f"Pylint MCP exited with code {pylint.returncode}"
                )
            if api.returncode is not None:
                raise RuntimeError(f"FastAPI exited with code {api.returncode}")

            duck = processes["duckduckgo"]
            if duck is not None and duck.returncode is not None:
                LOG.error(
                    "DuckDuckGo MCP exited with code %s; research is unavailable",
                    duck.returncode,
                )
                if duck_restarts < 3:
                    duck_restarts += 1
                    LOG.info("Retrying DuckDuckGo MCP (%d/3)", duck_restarts)
                    processes["duckduckgo"] = await start_duckduckgo()
                    if processes["duckduckgo"] is not None:
                        await wait_for_mcp(DUCK_URL, "DuckDuckGo", required=False)
                else:
                    LOG.error("DuckDuckGo MCP retry limit reached; leaving it unavailable")
                    processes["duckduckgo"] = await start_process(
                        [sys.executable, "-c", "import time; time.sleep(3600)"]
                    )
    finally:
        for process in processes.values():
            await stop_process(process)

    return 0


if __name__ == "__main__":
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        sys.exit(asyncio.run(run()))
    except Exception:
        LOG.exception("Critical service startup/runtime failure")
        sys.exit(1)
