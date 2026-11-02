import logging
from langchain_core.messages import HumanMessage
from langchain.agents import create_agent
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from .system_prompts import System_prompt
from ..utils.helper import get_llm,log_error
from ..constant.constant import DB_URI
from ..settings.settings import settings


logger = logging.getLogger(__name__)


class ResearchAgent:

    # SQ: 1.59 to SQ: 1.60, description: Initializes the ResearchAgent with LLM, research prompt
    def __init__(self):
        print("research init")

        self.llm = get_llm(max_tokens=500, temperature=0)
        self.prompt=System_prompt()
        self.db_url=str(DB_URI)
    # SQ: 1.137 to SQ: 1.143, description: Creates and runs the research agent with tools, returning the final researched output.
    async def _run_agent(self,question: str,review_comments:str,tools) -> str:
        try:
                
                agent = create_agent(
                    model=self.llm,
                    tools=tools,
                    system_prompt=self.prompt.research_system_prompt,
                )


                response = await agent.ainvoke(
                    {"messages":  [HumanMessage(content=f"user_query:{question},review comments can be empty review comments:{review_comments}")]},
                )
                final_message=response["messages"][-1].content
                print("Final message research agent:-----------",final_message)
                return final_message
        
        except Exception as e:
             logger.error(e)
             log_error("research_agent.py", "_run_agent", e)
             raise e
        
    #SQ: 1.133 to SQ: 1.145, description: Connects to duckduckgo server, loads tools, executes the research flow, and returns the response.
    async def ask(self,question: str,review_comments:str) -> str:
            try:
                logger.info(f"Customer: {question}")
                if not settings.duckduckgo:
                    raise RuntimeError(
                        "Research is unavailable because DUCK_DUCK_GO is not configured"
                    )

                client = MultiServerMCPClient(
                    {
                    "duckduckgo": {
                        "transport": "streamable_http",
                        "url":settings.duckduckgo,
                        }
                    }
                )

                async with client.session("duckduckgo") as session:

                    tools = await load_mcp_tools(session)
                    logger.info(f"Loaded {len(tools)} tools: {[t.name for t in tools]}")

                    final = await self._run_agent(
                        question,review_comments,
                        tools,
                    )

                logger.info(f"ResearchBot: {final}")
                return final
            except Exception as e:
                 logger.error(e)
                 log_error("research_agent.py", "ask", e)
                 raise e