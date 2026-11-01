import ast
import logging
import re

from langchain_core.messages import HumanMessage

from .system_prompts import System_prompt
from .local_code_model import get_local_code_model
from ..settings.settings import settings
from ..utils.helper import get_llm, log_error

logger = logging.getLogger(__name__)

class CodeAgent:
    
    # SQ: 1.47 to SQ: 1.51, description: Initializes the CodeAgent with LLM, system prompt
    def __init__(self):
        self.model = (
            get_local_code_model()
            if settings.code_generation_provider == "local"
            else get_llm(max_tokens=settings.local_model_max_new_tokens, temperature=0)
        )
        self.uses_local_model = settings.code_generation_provider == "local"
        self.prompt = System_prompt()

    @staticmethod
    def _sanitize_generated_text(text: str) -> str:
        cleaned = (text or "").strip()
        fence_match = re.search(
            r"```(?:python|py)?\s*(.*?)```",
            cleaned,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if fence_match:
            cleaned = fence_match.group(1).strip()
        else:
            cleaned = re.sub(r"^```(?:python|py)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```\s*$", "", cleaned, flags=re.DOTALL)
        cleaned = re.sub(
            r"^(?:here is|here's|sure|certainly|below is|the function is|the code is)"
            r"\s*[:\-]?\s*",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip()
        if not cleaned:
            raise ValueError("Code generation returned empty code")
        try:
            ast.parse(cleaned)
        except SyntaxError as exc:
            raise ValueError(f"Code generation returned invalid Python: {exc}") from exc
        return cleaned

    async def _generate_with_groq(
        self, question: str, context: str, review_comments: str
    ) -> str:
        prompt = (
            f"User request:\n{question}\n\nResearch context:\n{context or 'None'}"
            f"\n\nReview feedback to address:\n{review_comments or 'None'}"
        )
        response = await self.model.ainvoke(
            [
                HumanMessage(
                    content=f"{self.prompt.code_system_prompt}\n\n{prompt}"
                )
            ]
        )
        content = response.content
        if not isinstance(content, str):
            raise ValueError("Groq code generation returned a non-text response")
        return self._sanitize_generated_text(content)

    # SQ: 1.102 to SQ: 1.109, description: Builds the agent executes the query, and returns the final response.
    async def _run_agent(self, question: str,context:str,review_comments:str) -> str:
        try:
            if self.uses_local_model:
                final_content = await self.model.generate(
                    question, context, review_comments, self.prompt.code_system_prompt
                )
            else:
                final_content = await self._generate_with_groq(
                    question, context, review_comments
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
