from sqlalchemy.orm import Session
from ..utils.error_codes import database_error
from ..utils.logger import logger
from .schema.schema import (ErrorLogs)
class ErrorLogRepository:
    def __init__(self,Database):
        self.db = Database()

    #SQ 1.163 to 1.163 description: used to get the session 
    def _get_session(self) -> Session:
        try:
            return self.db.SessionLocal()
        except Exception as e:
            logger.error(f"Create session error: {e}")
            raise database_error("Database connection failed")

    #SQ:1.162 TO SQ:1.169 description: creates a orm entity for new errors and store it in database
    def store_error(self,file_name:str,function_name:str,error:str):
        session=None
        try:
            session=self._get_session()
            log=ErrorLogs(file_name=file_name,function_name=function_name,error=error)
            session.add(log)
            session.commit()
        except Exception as e:
            session.rollback()
            print("Error while saving log",e)
        finally:
            if session:
                session.close()  