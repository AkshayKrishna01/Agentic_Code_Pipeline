import logging
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage
from ..models.models import AgentState
from ..utils.helper import (success_response,error_response,log_error,)
from ..utils.error_codes import ApplicationError
from ..utils.helper import get_llm
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from ..constant.constant import DB_URI,RETRIES_LIMIT
from ..agent.system_prompts import System_prompt
from ..utils.asyncio_helpers import run_with_compatible_loop

logger = logging.getLogger(__name__)

class CodePipelineService:
    
    # SQ: 1.46 to SQ: 1.64 , description: Initializes agents, LLM, and db uri .
    def __init__(self, CodeAgent, ReviewAgent, ResearchAgent,request_id):
        print("service init")
        self.code_agent = CodeAgent()
        self.review_agent = ReviewAgent()
        self.research_agent = ResearchAgent()
        self.llm = get_llm()
        self.db_uri = str(DB_URI)
        self.request_id=request_id
        self.prompt=System_prompt()

    # SQ: 1.70 to SQ: 1.101, description: Constructs and compiles the LangGraph workflow defining routing, execution flow, and retry logic.
    def _build_graph(self, checkpointer):
        try:
            logger.info("building graph")
            workflow = StateGraph(AgentState)
            
            # SQ: 1.71 to SQ: 1.76 , description: Uses LLM to classify the user query into research, code, or review.            
            async def _decision_node(state: AgentState):
                response = await self.llm.ainvoke([
                    HumanMessage(content=f"""{self.prompt.orchestrator_prompt}
            {state["user_query"]}
            """)
                ])


                response = response.content.strip().lower()
                logger.info("Decision: %s --------------decision------------------", response)
                if response == "greet":
                    state["code"]="Hello there! How can I assist you with code development?"
                elif response not in ["research", "code", "review","greet"]:
                      return {
                        **state,
                        "route": "invalid",
                        "code": response
                    }
                elif response=="review":
                    state["code"]=state["user_query"]
                return {**state, "route": response}

            # SQ: 1.77 to SQ: 1.78, description: Fetches contextual information using the ResearchAgent. 
            async def _research_node(state: AgentState):
                context = await self.research_agent.ask(
                    state["user_query"],state["review"]
                )
                return {**state, "context": context}
            
            # SQ: 1.79 to SQ: 1.80, description: Generates code using the CodeAgen                
            async def _code_node(state: AgentState):
                code = await self.code_agent.ask(
                    state["user_query"],state["context"],state["review"]
                )
                return {**state, "code": code}

            # SQ: 1.81 to SQ: 1.87, description: Reviews generated code, determines pass/fail, and manages retry count.                
            async def _review_node(state: AgentState):
                review = await self.review_agent.ask(
                    state["code"]
                )
                status = "pass"
                if "fail" in review.lower():
                    status = "fail"
                retries = state.get("retries", 0)
                if status == "fail":
                    retries += 1
                return {
                    **state, "review": review, "status": status, "retries": retries
                }
            
            workflow.add_node("decide", _decision_node)
            workflow.add_node("research", _research_node)
            workflow.add_node("code", _code_node)
            workflow.add_node("review", _review_node)
            workflow.add_edge(START, "decide")

            # SQ: 1.93 to SQ: 1.93, description:  Routes execution to the appropriate node based on LLM classification
            def _decide_route(state: AgentState):
                return state.get("route", "code")

            workflow.add_conditional_edges(
                "decide", _decide_route,
                {"research": "research", "code": "code", "review": "review","invalid":END,"greet":END}
            )
            workflow.add_edge("research", "code")
            workflow.add_edge("code", "review")
            
            # SQ: 1.97 to SQ: 1.98, description: Decides whether to retry via research or end the pipeline based on review result.
            def _review_route(state: AgentState):
                if state["status"] == "fail" and state["retries"] < RETRIES_LIMIT:
                    return "research"
                return END
                
            workflow.add_conditional_edges(
                "review", _review_route, {"research": "research", END: END}
            )

            return workflow.compile(checkpointer=checkpointer)
        except Exception as e:
            logger.error(e)
            log_error("service.py", "_build_graph", e)
            raise e
        
    # SQ: 1.65 to SQ: 1.176, description:  Executes the full agent workflow and returns the final structured API response and creates a checkpoint for graph     
    async def code_pipeline(self, user_query: str, thread_id: str):
        return await run_with_compatible_loop(
            lambda: self._code_pipeline(user_query, thread_id)
        )

    async def _code_pipeline(self, user_query: str, thread_id: str):
        try:
            async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
                await checkpointer.setup()
                self.graph = self._build_graph(checkpointer)
                config = {"configurable": {"thread_id": thread_id}}
                agent_state = {
                    "user_query": user_query,
                    "code": "", "review": "", "status": "",
                    "context": "", "route": "","retries": 0,
                    "thread_id": thread_id
                }
                
                result = await self.graph.ainvoke(agent_state, config)
                final_response = result.get("code")

 
                final_data = {"output": final_response}
                return success_response(
                    status_code=200, message="Chatbot response generated",
                    data=final_data, request_id=self.request_id
                )

        except ApplicationError as e:
            logger.error(e)
            log_error("service.py", "code_pipeline", e)
            return error_response(
                status_code=400, message=str(e), error=str(e), request_id=self.request_id
            )
        except Exception as e:
            logger.exception("Pipeline execution failed")
            log_error("service.py", "code_pipeline", e)
            return error_response(
                status_code=500,
                message="Pipeline failed",
                error="Internal server error",
                request_id=self.request_id,
            )
