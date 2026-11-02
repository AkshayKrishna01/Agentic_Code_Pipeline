FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_CACHE_DIR=/opt/uv-cache

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY Backend/pyproject.toml Backend/uv.lock Backend/README.md /app/backend/
RUN cd /app/backend && uv sync --frozen --no-install-project --no-dev

COPY pylint/pylint_mcp/pyproject.toml pylint/pylint_mcp/uv.lock pylint/pylint_mcp/README.md /app/pylint-mcp/
RUN cd /app/pylint-mcp && uv sync --frozen --no-install-project --no-dev

RUN uvx duckduckgo-mcp-server --help >/dev/null

COPY Backend/src /app/backend/src
COPY Backend/start_services.py /app/backend/start_services.py
COPY pylint/pylint_mcp/src /app/pylint-mcp/src

RUN mkdir -p /tmp/code-pipeline-review /opt/uv-cache \
    && chmod -R a+rX /app \
    && chmod -R a+rwX /opt/uv-cache \
    && chmod a+rwx /tmp/code-pipeline-review

WORKDIR /app/backend
EXPOSE 8080
USER 10001:10001

CMD ["/app/backend/.venv/bin/python", "/app/backend/start_services.py"]
