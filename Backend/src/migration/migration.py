from sqlalchemy import inspect
from ..repository.schema.schema import ErrorLogs
from ..repository.database.database_connection import Database
 
TABLE_ORDER_CREATION = [
    ErrorLogs.__tablename__,
]

MODEL_CLASSES = {
    ErrorLogs.__tablename__:ErrorLogs,
}


class Migration:
    def __init__(self):
        self.db = Database()
        self.engine = self.db.engine
        self.inspector = inspect(self.engine)

    def create_tables(self):
        for table_name in TABLE_ORDER_CREATION:
            if not self.inspector.has_table(table_name):
                print("creating table")
                MODEL_CLASSES[table_name].__table__.create(bind=self.engine)
