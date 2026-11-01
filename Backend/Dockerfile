FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

ARG INSTALL_LOCAL_MODEL=false

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY pyproject.toml uv.lock README.md ./
RUN if [ "$INSTALL_LOCAL_MODEL" = "true" ]; then \
        uv sync --no-install-project --no-dev --extra local-model; \
    else \
        uv sync --no-install-project --no-dev; \
    fi

COPY --chown=10001:10001 src ./src
COPY --chown=10001:10001 adapter ./adapter
USER 10001:10001

EXPOSE 8080
CMD ["/app/.venv/bin/uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
