from datetime import datetime, timezone
from ..models.models import APIResponse
from typing import Dict,Optional,Any
import traceback
import logging
from dotenv import load_dotenv
from langchain_groq import ChatGroq
import os
from ..models.models import Error
from datetime import datetime, timezone
from ..repository.repository import ErrorLogRepository
from ..repository.database.database_connection import Database
load_dotenv()

logger=logging.getLogger(__name__)

#SQ 1.151 to SQ 1.153 description:Creates a standardized success API response and attaches a timestamp to the data.
def success_response(
    status_code: int,
    message: str,
    data: Optional[Dict],
    request_id: str,
) -> APIResponse:

    current_time = datetime.now(timezone.utc)

    if data is not None:
        data["timestamp"] = current_time.isoformat()

    return APIResponse(
        status_code=status_code,
        status="success",
        message=message,
        data=data,
        error=None,
        request_id=request_id,
    )

#SQ 1.171 to SQ 1.173 description:Creates a structured error API response with error details and timestamp
def error_response(
    status_code: int,
    message: str,
    error: Any,
    request_id: str,
) -> APIResponse:
    return APIResponse(
        status_code=status_code,
        status="error",
        message=message,
        data=None,
        error=Error(  
            error=str(error),
            timestamp=datetime.now(timezone.utc),
        ),
        request_id=request_id,
    )

#SQ 1.157 to SQ 1.169 description:Logs and persists error details including stack trace using the repository layer.
def log_error(file_name: str,function_name:str,exception:Exception):
    try:
        repo=ErrorLogRepository(Database)
        error_message=str(exception)
        stack_trace=traceback.format_exc()
        full_error=f"{error_message}|TRACE: {stack_trace}"
        repo.store_error(file_name=file_name,function_name=function_name,error=full_error)
    except Exception as e:
        logger.exception("Failed to store error via ErrorLogRepository: %s", e)

# SQ 1.48 to SQ 1.48 description:Creates and returns a configured Groq LLM instance with specified parameters.
def get_llm(max_tokens=500, temperature=0.7):
    api_key = os.getenv("GROQ_API_KEY")
    model_name = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    if not api_key:
        raise ValueError("GROQ_API_KEY is not set. Add your Groq API key to the environment.")

    return ChatGroq(
        model=model_name,
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
    )