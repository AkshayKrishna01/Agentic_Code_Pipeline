import asyncio
import sys

from fastapi import FastAPI
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from src.agent.code_agent import CodeAgent
from src.models.models import AgentState, PipelineRequest
from src.routes import routes
from src.services.service import CodePipelineService
from src.utils.asyncio_helpers import run_with_compatible_loop, run_with_selector_loop


def test_selector_loop_runner_uses_selector_event_loop():
    async def get_running_loop_type():
        return type(asyncio.get_running_loop())

    assert run_with_selector_loop(get_running_loop_type) is asyncio.SelectorEventLoop


def test_compatible_loop_runner_uses_selector_thread_on_windows():
    async def get_running_loop_type():
        return type(asyncio.get_running_loop())

    async def verify_loop():
        loop_type = await run_with_compatible_loop(get_running_loop_type)
        if sys.platform == "win32":
            assert loop_type is asyncio.SelectorEventLoop
        else:
            assert loop_type is type(asyncio.get_running_loop())

    asyncio.run(verify_loop())


def test_graph_keeps_review_retry_path(monkeypatch):
    monkeypatch.setattr("src.services.service.get_llm", lambda: None)
    class Decision:
        async def ainvoke(self, *args): return AIMessage(content="code")
    class DummyCode:
        def __init__(self): self.calls = 0
        async def ask(self, *args):
            self.calls += 1
            return "print('fixed')"
    class DummyReview:
        def __init__(self): self.calls = 0
        async def ask(self, code):
            self.calls += 1
            return "STATUS: fail" if self.calls == 1 else "STATUS: pass"
    class DummyResearch:
        async def ask(self, *args): return "context"
    service = CodePipelineService(DummyCode, DummyReview, DummyResearch, "id")
    service.llm = Decision()
    graph = service._build_graph(None)
    result = asyncio.run(graph.ainvoke({
        "user_query": "write code", "code": "", "review": "", "status": "",
        "context": "", "route": "", "retries": 0, "thread_id": "user",
    }))
    assert result["status"] == "pass"
    assert result["retries"] == 1
    assert service.code_agent.calls == 2


def test_http_endpoint_returns_pipeline_result(monkeypatch):
    class FakeService:
        def __init__(self, *args): pass
        async def code_pipeline(self, query, thread):
            from src.utils.helper import success_response
            return success_response(200, "ok", {"output": "print(1)"}, "request")
    monkeypatch.setattr(routes, "CodePipelineService", FakeService)
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[routes.require_api_token] = lambda: None
    with TestClient(app) as client:
        response = client.post("/api/v1/agentic/pipeline/code", json={"user_query": "code", "user_id": "u"},
                               headers={"Authorization": "Bearer test"})
    assert response.status_code == 200
    assert response.json()["data"]["output"] == "print(1)"


def test_code_agent_delegates_to_local_model(monkeypatch):
    class Model:
        async def generate(self, *args): return "print('local')"
    monkeypatch.setattr("src.agent.code_agent.get_local_code_model", lambda: Model())
    agent = CodeAgent()
    assert asyncio.run(agent.ask("q", "ctx", "review")) == "print('local')"
