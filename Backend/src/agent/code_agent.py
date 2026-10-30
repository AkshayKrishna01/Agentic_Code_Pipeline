import logging
from .system_prompts import System_prompt
from .local_code_model import get_local_code_model
from ..utils.helper import log_error

logger = logging.getLogger(__name__)

class CodeAgent:
    
    # SQ: 1.47 to SQ: 1.51, description: Initializes the CodeAgent with LLM, system prompt
    def __init__(self):
        self.model = get_local_code_model()
        self.prompt = System_prompt()

    # SQ: 1.102 to SQ: 1.109, description: Builds the agent executes the query, and returns the final response.
    async def _run_agent(self, question: str,context:str,review_comments:str) -> str:
        try:
            final_content = await self.model.generate(
                question, context, review_comments, self.prompt.code_system_prompt
            )
            logger.info(f"Final messages code agent --------: {final_content}")

            return final_content

        except Exception as e:
            log_error("code_agent.py", "_run_agent", e)
            raise e

    # SQ: 1.102 to SQ: 1.111, description:Invokes the agent and returns the generated code response.
    async def ask(self, question: str,context:str,review_comments:str) -> str:
        try:
            logger.info(f"Customer: {question}")

            final = await self._run_agent(question,context,review_comments)

            logger.info(f"CodeBot: {final}")
            return final

        except Exception as e:
            log_error("code_agent.py", "ask", e)
            logger.error(e)
            raise e
