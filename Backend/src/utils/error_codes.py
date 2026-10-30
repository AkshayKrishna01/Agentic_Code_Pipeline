from enum import Enum
from typing import Optional, Dict, Any

class ErrorCode(Enum):
    DATABASE_ERROR = "500"


HTTP_STATUS_MAP = {
    ErrorCode.DATABASE_ERROR: 500,
}


class ApplicationError(Exception):
    def __init__(
        self,
        error_code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.code = error_code.value
        self.http_status = HTTP_STATUS_MAP.get(error_code, 500)
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details
            }
        }




def database_error(operation: str) -> ApplicationError:
    return ApplicationError(
        ErrorCode.DATABASE_ERROR,
        message=f"Failure beacuse of: {operation} "
    )




