import hmac
import logging
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Any
import uuid
from ..models.models import  PipelineResponse, PipelineRequest
from ..services.service import CodePipelineService
from ..utils.helper import error_response,log_error
from ..agent.code_agent import CodeAgent
from ..agent.review_agent import ReviewAgent
from ..agent.research_agent import ResearchAgent
from ..settings.settings import settings

logger = logging.getLogger(__name__)
bearer = HTTPBearer(auto_error=False)


async def require_api_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    supplied = credentials.credentials if credentials else ""
    if not supplied or not hmac.compare_digest(supplied, settings.api_auth_token):
        raise HTTPException(
            status_code=401,
            detail="A valid bearer token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )


router = APIRouter(
    prefix="/api/v1/agentic",
    tags=["multi-agent pipeline"],
    dependencies=[Depends(require_api_token)],
)

# SQ: 1.38 to SQ: 1.181, description: Handles incoming API requests, triggers the pipeline service, and returns the response.
@router.post("/pipeline/code", response_model=PipelineResponse, status_code=200,response_model_exclude_none=True)
async def code_pipeline(
        payload: PipelineRequest,         
        response: Response,           
    ) -> Any:
        request_id = None
        try:
            request_id=str(uuid.uuid4())
            service = CodePipelineService(CodeAgent,ReviewAgent,ResearchAgent,request_id)
            result = await service.code_pipeline(payload.user_query,payload.user_id)
            response.status_code=result.status_code
            return result
        except Exception as e:
            response.status_code = 500
            logger.exception("Unexpected pipeline route failure")
            log_error(file_name="route.py",function_name="code_pipeline",exception=e)
            return error_response(
                status_code=500,
                message="Pipeline failed",
                error="Internal server error",
                request_id=request_id,
            )
