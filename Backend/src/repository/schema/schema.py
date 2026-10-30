from __future__ import annotations
import uuid
from sqlalchemy import (Column, String, Integer, Boolean,DateTime,text)
from sqlalchemy.orm import  declarative_base

Base = declarative_base()

def gen_uuid() -> str:
    return str(uuid.uuid4())

class ErrorLogs(Base):
    __tablename__ = "error_logs"

    error_id = Column(Integer, primary_key=True, index=True)
    id = Column(String,default=gen_uuid)

    file_name = Column(String, nullable=False)
    function_name = Column(String, nullable=False)
    error = Column(String, nullable=False)

    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    created_by = Column(String, default="SYSTEM")
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_by = Column(String, default="SYSTEM")

    is_active = Column(Boolean, default=True)