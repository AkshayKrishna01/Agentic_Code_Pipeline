import logging
from pathlib import Path
from tempfile import NamedTemporaryFile
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from .system_prompts import System_prompt
from ..utils.helper import get_llm,log_error
from ..settings.settings import settings
from..constant.constant import PYLINT_WORKSPACE 
logger = logging.getLogger(__name__)
 
 
class ReviewAgent:
    
    # SQ: 1.54 to SQ: 1.56, description: Initializes the ResearchAgent with LLM, review prompt and pylint workspace directory
    def __init__(self):
        logger.info("review init")
        self.llm = get_llm(max_tokens=4000, temperature=0)
        self.prompt = System_prompt()
        self.pylint_workspace=PYLINT_WORKSPACE
    
    # SQ: 1.123 to SQ: 1.129, description: Creates and runs the review agent with tools, returning the final reviewed output.
    async def _run_agent(self, file_path_str: str, tools) -> str:
        try:
            agent = create_agent(
                model=self.llm,
                tools=tools,
                system_prompt=self.prompt.review_system_prompt,
    )
 
            response = await agent.ainvoke(
                {
                    "messages": [
                        HumanMessage(content=(
                                f"Analyse this Python file: {file_path_str}\n"
                                "Use the available pylint tools to review it.\n"
                                "DO NOT rewrite or modify the code.\n"
                                "Return exactly two plain-text lines: STATUS: pass or fail, "
                                "then COMMENT: followed by the justification. "
                                "If the review score is above 6.0, use pass. "
                                "Ignore newline-only issues."
                                
                            )) ]   })
 
            last_message = response["messages"][-1].content
            logger.info(f"Final review response: {last_message}")
            return last_message
 
        except Exception as e:
            logger.error(e)
            log_error("review_agent.py", "_run_agent", e)
            raise e
 
    #SQ: 1.113 to SQ: 1.131, description: Connects to pylint MCP server, loads tools, executes the review flow, and returns the response. 
    async def ask(self, code: str) -> str:
        review_path = None
        try:
            workspace = Path(self.pylint_workspace)
            workspace.mkdir(parents=True, exist_ok=True)
            with NamedTemporaryFile(
                mode="w", encoding="utf-8", suffix=".py", prefix="review_",
                dir=workspace, delete=False,
            ) as review_file:
                review_file.write(code)
                review_path = Path(review_file.name)
            logger.info("Wrote temporary review input")
            file_path_str = review_path.as_posix()
            client = MultiServerMCPClient(
                {
                    "pylint-server": {
                        "transport": "streamable_http",
                        "url":settings.pylint_mcp_server_url,
                    }
                }
            )
 
            async with client.session("pylint-server") as session:
                
                tools = await load_mcp_tools(session)
                logger.info(f"Loaded {len(tools)} tools: {[t.name for t in tools]}")
                response = await self._run_agent(file_path_str, tools)
                return str(response)
 
        except Exception as e:
            log_error("review_agent.py", "ask", e)
            logger.exception("Code review failed")
            raise e
        finally:
            if review_path is not None:
                review_path.unlink(missing_ok=True)
