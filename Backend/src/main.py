import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from .constant.constant import DB_URI
from .migration.migration import Migration
from .repository.database.database_connection import Database
from .settings.settings import settings
from .agent.local_code_model import initialize_local_code_model
from .utils.asyncio_helpers import run_with_compatible_loop

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Fail startup when configuration, the database, or schema is not ready."""
    settings.validate()
    if settings.code_generation_provider == "local":
        initialize_local_code_model(settings)
    database = Database()
    with database.engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    Migration().create_tables()

    async def setup_checkpoint_schema() -> None:
        async with AsyncPostgresSaver.from_conn_string(DB_URI) as checkpointer:
            await checkpointer.setup()

    await run_with_compatible_loop(setup_checkpoint_schema)
    logging.getLogger().setLevel(settings.log_level.upper())
    logger.info("Application startup complete")
    try:
        yield
    finally:
        database.engine.dispose()


def create_app() -> FastAPI:
    application = FastAPI(
        title="Multi-Agent Code Pipeline API",
        description="API for code generation, review, and contextual research.",
        version="1.0.0",
        lifespan=lifespan,
    )
    if settings.cors_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_origins),
            allow_credentials=False,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type"],
        )

    from .routes.routes import router

    application.include_router(router)

    @application.get("/health/live", tags=["health"])
    async def liveness():
        return {"status": "ok"}

    @application.get("/health/ready", tags=["health"])
    async def readiness():
        try:
            with Database().engine.connect() as connection:
                connection.execute(text("SELECT 1"))
        except Exception as exc:
            logger.warning("Readiness check failed: %s", exc)
            raise HTTPException(status_code=503, detail="Database unavailable") from exc
        return {"status": "ready"}

    return application


# Required for standard ASGI servers: `uvicorn src.main:app`.
app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host=settings.host, port=settings.port, log_level=settings.log_level.lower())
