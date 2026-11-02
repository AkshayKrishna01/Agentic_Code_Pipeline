from sqlalchemy import URL, create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from ...settings.settings import settings
 
class Database:
    _instance = None  
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
 
    def _initialize(self):
        password = (settings.db_password)
 
        db_url = URL.create(
            "postgresql+psycopg",
            username=settings.db_username,
            password=password,
            host=settings.db_host,
            port=settings.db_port,
            database=settings.db_name,
        )
 
        self.engine = create_engine(db_url, pool_pre_ping=True)
 
        self.SessionLocal = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False
        )
 
    def get_session(self):
        session = self.SessionLocal()
        try:
            yield session
        finally:
            session.close()
 
    def inspector(self):
        return inspect(self.engine)
 
    def test_connection(self):
        try:
            with self.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
