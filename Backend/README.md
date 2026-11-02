# Multi-Agent Code Pipeline API

FastAPI service for code generation, research, and review. Code generation can use either a locally loaded fine-tuned Qwen/LoRA model or Groq, while PostgreSQL stores application error logs and LangGraph checkpoints and MCP services provide web research and pylint.

## Technical overview

This project exposes an HTTP API around an asynchronous, graph-based Python code assistant. A request is classified by an LLM, then handled by LangGraph nodes that can research a topic, generate code, and review that code. The graph can return to research and code generation when review fails, up to a configured retry limit. Set `CODE_GENERATION_PROVIDER=local` to load Qwen and the adapter, or `CODE_GENERATION_PROVIDER=groq` to generate code through Groq without loading local model files.

The service is an orchestration layer, not a code execution environment: generated code is returned to the caller and is not run by the API. Review delegates static analysis to an external pylint MCP server. Research tools are provided by an external DuckDuckGo MCP server. Routing, research, and review model calls use LangChain's Groq integration; code generation uses a local Transformers/PEFT model loaded at startup.

### Components

| Component | Responsibility |
| --- | --- |
| FastAPI application (`src/main.py`) | Creates the ASGI app, configures optional CORS, initializes databases on startup, and exposes health endpoints. |
| API route (`src/routes/routes.py`) | Validates the bearer token, accepts a pipeline request, creates a request ID, invokes the service, and returns its response. |
| Pipeline service (`src/services/service.py`) | Builds and invokes the LangGraph state machine and connects it to PostgreSQL checkpointing. |
| Decision node | Uses the orchestrator prompt and Groq model to classify the query as `greet`, `research`, `code`, or `review`; unrecognized output follows the `invalid` end route. |
| Research agent (`src/agent/research_agent.py`) | Loads tools from the configured DuckDuckGo MCP endpoint and asks an LLM agent to produce research context. |
| Code agent (`src/agent/code_agent.py`) | Uses either the locally loaded Qwen base model and Stage 2 LoRA adapter, or Groq, with the code-generation prompt and research/review context. It has no MCP tools. |
| Review agent (`src/agent/review_agent.py`) | Writes review input to a temporary `.py` file, loads tools from the pylint MCP endpoint, and asks an LLM agent to report pass/fail and comments. The temporary file is removed after the review call. |
| Settings and helpers (`src/settings/`, `src/utils/`) | Load and validate environment settings, construct Groq clients, format API responses, and persist application errors. |
| PostgreSQL persistence (`src/repository/`, `src/migration/`) | Stores application error records in `error_logs`; LangGraph's PostgreSQL checkpointer stores graph checkpoints separately. |

### Request lifecycle

1. The client sends JSON to `POST /api/v1/agentic/pipeline/code` with an `Authorization: Bearer ...` header.
2. FastAPI validates the body. `user_query` and `user_id` must be non-empty strings; surrounding whitespace is stripped.
3. The route creates a UUID request ID and constructs the pipeline service and its agents.
4. The service opens the checkpoint database, compiles the graph with a `thread_id` taken from `user_id`, and starts a graph run with a fresh state.
5. The decision node asks the LLM to classify the query:
   - `greet`: returns a fixed greeting without research or code review.
   - `code`: sends the query to code generation, then review.
   - `research`: gathers research context, then generates and reviews code using that context.
   - `review`: treats the submitted query text as the review input, then reviews it. Include the Python source in `user_query` when requesting a review.
   - An unrecognized classification ends the graph with the classifier's text as the output.
6. For code/research paths, the review agent asks the pylint MCP server to analyze a temporary file. If the returned review text contains the substring `fail` (case-insensitive), the graph increments its retry counter and, while below `RETRIES_LIMIT` (3), returns to research and code generation before reviewing again. Since the counter starts at zero and increments on each failure, this permits up to two regenerations and at most three review attempts in one invocation.
7. The service returns the final text in a standard success envelope with a timestamp and request ID. It does not return a separate structured review result or retry count.

```text
HTTP request
    |
    v
FastAPI route -- bearer authentication and request validation
    |
    v
LangGraph: decide
    | greet / invalid
    +------------------------------> response
    |
    +-- research --> code --> review -- pass / retry limit --> response
                                |
                                +-- fail and retries remain --> research
```

### Graph state and persistence

The graph passes an `AgentState` containing the original query, generated/reviewed text, research context, selected route, review status, retry count, and `thread_id`. `user_id` is used as that thread ID. It is not checked against an account table and is not itself an authentication credential; the bearer token is the API's authentication mechanism.

The graph is configured with LangGraph's PostgreSQL async checkpointer. The application database (`DB_NAME`) is used by SQLAlchemy for the `error_logs` table, while `DB_NAME_CHECKPOINT` is used for LangGraph checkpoint tables. Startup initializes the error-log table if absent and calls the checkpointer setup. Each pipeline invocation supplies a newly constructed initial state; the code does not explicitly load prior messages into prompts as conversational memory.

Application errors are stored with the originating file, function, message, and formatted traceback. The `error_logs` table also includes identifiers, timestamps, creator/updater metadata, and an active flag. Failures while persisting an error are logged but do not replace the original pipeline response.

### API contract

**Request**

```http
POST /api/v1/agentic/pipeline/code
Authorization: Bearer <API_AUTH_TOKEN>
Content-Type: application/json
```

```json
{
  "user_query": "Write a Python function to add two numbers",
  "user_id": "example-user"
}
```

Every pipeline call must include the configured token using the HTTP `Bearer` authorization scheme.

**Successful response**

```json
{
  "status_code": 200,
  "status": "success",
  "message": "Chatbot response generated",
  "data": {
    "output": "<assistant output>",
    "timestamp": "<UTC timestamp>"
  },
  "request_id": "<request UUID>"
}
```

The response model omits `error` when it is null. Authentication failures return HTTP 401, invalid request bodies are rejected by FastAPI (HTTP 422), and unhandled pipeline/route failures use an error response with HTTP 500. A handled `ApplicationError` in the service is mapped to HTTP 400. Greetings and unrecognized classification labels are currently returned in a success-shaped response.

### Health endpoints

| Endpoint | Authentication | Behavior |
| --- | --- | --- |
| `GET /health/live` | None | Returns `{"status":"ok"}` when the process can serve the request; it does not check dependencies. |
| `GET /health/ready` | None | Executes `SELECT 1` against the application database and returns 503 if that database is unavailable. It does not probe the checkpoint database, Groq, or either MCP server. |

### Important behavior and boundaries

- This API returns generated text; it does not execute generated code, apply patches to a repository, or expose a file-management API.
- The review operation submits user text as a Python file. The pylint MCP service must be able to read the exact `PYLINT_WORKSPACE` path; in separate containers, mount a private shared volume at that path in both services.
- The review decision is based on whether the review agent's response contains the substring `fail`. The prompt requests `STATUS` and `COMMENT` lines and describes a score threshold above 6.0, but the application does not parse a numeric score or structured review schema.
- `user_id` chooses a LangGraph checkpoint thread, but there is no per-user authorization or ownership check in the route. Protect the API and its bearer token accordingly.
- The shared bearer token is checked with constant-time comparison and must be at least 32 characters. The API does not implement user accounts, token rotation, or per-client scopes.
- The `/health/*` endpoints are unauthenticated. Configure network access and ingress policies with that behavior in mind.
- CORS is disabled when `CORS_ORIGINS` is empty. When configured, it allows the listed origins, `GET`/`POST`/`OPTIONS`, and `Authorization`/`Content-Type` headers; credentialed CORS is disabled.
- Startup requires the configured databases and database privileges to initialize their schemas. Liveness does not imply that external model or MCP integrations are available.

### Source layout

```text
src/
  main.py                           FastAPI app, lifespan, CORS, health checks
  routes/routes.py                  Authenticated pipeline endpoint
  services/service.py               LangGraph orchestration and retry routing
  agent/
    code_agent.py                   Code-generation agent
    research_agent.py               DuckDuckGo MCP research agent
    review_agent.py                 Pylint MCP review agent and temp-file lifecycle
    system_prompts.py               Orchestrator, code, research, and review prompts
  models/models.py                  Request, response, and graph-state models
  settings/settings.py              Environment-backed settings and validation
  constant/constant.py              Checkpoint database URL and retry limit
  repository/
    database/database_connection.py SQLAlchemy engine/session factory
    repository.py                   Error-log persistence
    schema/schema.py                ErrorLogs ORM model
  migration/migration.py            Error-log table initialization
  utils/                            LLM, response, logging, and error helpers
```

## Requirements

- Python 3.14 or Docker
- PostgreSQL with two databases: one for the application (`DB_NAME`) and one for LangGraph checkpoints (`DB_NAME_CHECKPOINT`)
- A Groq API key
- Reachable DuckDuckGo and pylint MCP servers using streamable HTTP
- A random API bearer token with at least 32 characters

The application creates its `error_logs` table and LangGraph checkpoint schema during startup/first use. The database user needs permission to create tables and indexes in both databases.

## Configure

For local development, copy `src/.env.example` to `src/.env` and set real values. In a hosted environment, configure the same values as environment variables or secrets; do not commit `.env` files.

Required settings:

| Variable | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection |
| `DB_NAME` | Application database |
| `DB_NAME_CHECKPOINT` | LangGraph checkpoint database |
| `GROQ_API_KEY` | Groq credentials |
| `CODE_GENERATION_PROVIDER` | `local` for Qwen/LoRA or `groq` for Groq code generation; defaults to `local` |
| `LOCAL_MODEL_BASE` | Hugging Face base model when using local generation (default `Qwen/Qwen2.5-Coder-0.5B-Instruct`) |
| `LOCAL_MODEL_ADAPTER` | Stage 2 adapter directory (default repository `adapter/`) |
| `LOCAL_MODEL_MAX_NEW_TOKENS` | Maximum generated tokens (default `768`) |
| `LOCAL_MODEL_DEVICE` | `cpu` by default; `auto` selects CUDA when available, otherwise CPU |
| `LOCAL_MODEL_TIMEOUT` | Generation timeout in seconds (default `180`) |
| `DUCK_DUCK_GO` | Optional DuckDuckGo MCP streamable HTTP URL; research is unavailable when omitted |
| `PYLINT_MCP_SERVER_URL` | Pylint MCP streamable HTTP URL |
| `API_AUTH_TOKEN` | Bearer token; use a random secret of at least 32 characters |

Optional settings include `DB_PORT` (default `5432`), `HOST` (default `0.0.0.0`), `PORT` (default `8080`), `LOG_LEVEL` (default `INFO`), `GROQ_MODEL` (default `openai/gpt-oss-120b`), `CORS_ORIGINS` (comma-separated browser origins; empty disables CORS), and `PYLINT_WORKSPACE` (default `/tmp/code-pipeline-review`). Set `CODE_GENERATION_PROVIDER=groq` for deployment without Qwen, or `local` to use the checked-in Stage 2 adapter under `adapter/`. Configure `LOCAL_MODEL_ADAPTER` if you move it. `PROVIDER` does not currently select another integration. Generate a token with a cryptographically secure random generator, for example `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

Settings are read from environment variables; for local use, `src/settings/settings.py` also loads `src/.env`. Startup validates required credentials and URLs, token length, port ranges, and log level. It does not test the reachability of Groq or either MCP endpoint at startup.

## Run locally

```sh
uv sync --no-install-project --extra local-model  # use without this extra for Groq-only mode
uv run uvicorn src.main:app --host 0.0.0.0 --port 8080
```

The application validates configuration and database access at startup. Liveness is available at `/health/live`; readiness, which checks PostgreSQL, is at `/health/ready`.

Call the pipeline with:

```sh
curl -X POST http://localhost:8080/api/v1/agentic/pipeline/code \
  -H 'Authorization: Bearer YOUR_API_AUTH_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"user_query":"Write a Python function to add two numbers","user_id":"example-user"}'
```

## Build and run with Docker

Build from the repository root:

```sh
docker build -t multiagent-code-pipeline .
```

The production image installs the lightweight Groq-only dependency set and starts the backend plus the two internal MCP processes through `start_services.py`. Build it from the repository root with `docker build -f Backend/Dockerfile -t multiagent-code-pipeline .`. Pylint MCP is required; DuckDuckGo MCP is best effort so code-only workflows can start when research is unavailable.

Run with the required settings supplied through your deployment platform's secret/environment configuration:

```sh
docker run --rm -p 8080:8080 --env-file deployment.env multiagent-code-pipeline
```

The image runs as an unprivileged user and serves `src.main:app`. Do not bake credentials into the image. Configure the platform's health checks to use `/health/live` for liveness and `/health/ready` for readiness.

### Windows local setup

Install Python (3.14 as declared by this project) and [uv](https://docs.astral.sh/uv/). From PowerShell at the repository root:

```powershell
Copy-Item src/.env.example src/.env
# Edit src/.env and set database, Groq, MCP, and API token values.
uv sync --no-install-project --extra local-model
uv run uvicorn src.main:app --host 127.0.0.1 --port 8080
```

On Windows, Psycopg's asynchronous checkpoint operations run on a compatible selector event loop in a worker thread, so the standard Uvicorn command works with Windows' default Proactor event loop.

On first startup, Transformers downloads the base model from Hugging Face into its normal cache; the checked-in LoRA adapter is loaded from `adapter/`. CPU inference is supported and selected by default, though it can be slow. The adapter is not modified or merged. Startup reports missing adapter files and model download/load errors and stops without using an external code-generation model. Generation reports timeouts, inference failures, and syntactically invalid Python as pipeline errors. For offline startup, pre-cache the base model before launching.

Run mocked tests with `uv sync --extra test --extra local-model --no-install-project` followed by `uv run pytest`.

## Deployment notes

- Provision both PostgreSQL databases before starting the service and restrict network access to the application.
- Configure `API_AUTH_TOKEN` as a deployment secret and distribute it only to authorized clients.
- Configure explicit `CORS_ORIGINS` only if browser clients need cross-origin access.
- Supply reachable MCP URLs. Container `localhost` refers to the API container, not another service.
- The pylint MCP service must be able to read the files in `PYLINT_WORKSPACE`. Mount the same private shared volume at the same path in the API and pylint MCP containers, and configure `PYLINT_WORKSPACE` to that path.
- Run one worker initially. If you scale workers or replicas, ensure database migrations/checkpoint initialization are serialized by your deployment process.
- Put the service behind TLS at the load balancer or platform ingress, and set platform request/response timeouts to suit LLM calls.

## Runtime dependencies and operational considerations

- **Groq** serves routing and research/review agents. `GROQ_MODEL` selects this model; `PROVIDER` does not currently select another integration.
- **Code generation** is selected with `CODE_GENERATION_PROVIDER`. `local` uses Qwen/PEFT and loads the shared model once at startup; `groq` uses the configured Groq model and does not initialize Qwen or require the adapter at runtime. The local mode settings are `LOCAL_MODEL_BASE`, `LOCAL_MODEL_ADAPTER`, `LOCAL_MODEL_MAX_NEW_TOKENS`, `LOCAL_MODEL_DEVICE`, and `LOCAL_MODEL_TIMEOUT`.
- **DuckDuckGo MCP** provides tools only to the research agent. The service uses the MCP streamable HTTP transport and loads the server's tools for a request.
- **Pylint MCP** provides tools to the review agent. The API writes a temporary file before connecting and deletes it in a `finally` block after the review attempt. Ensure the workspace is private, writable by the API, and mounted readably by the MCP service.
- **PostgreSQL** has two logical roles: `DB_NAME` for SQLAlchemy application data and `DB_NAME_CHECKPOINT` for LangGraph checkpoint state. Both are assembled from the same host, port, username, and password.
- **Concurrency/scaling:** schema initialization is performed during application startup and checkpoint setup is also invoked in pipeline calls. Coordinate initialization when deploying multiple workers/replicas; use a single worker initially as indicated above.
- **Timeouts:** a request can involve several sequential model and MCP calls and up to three review-triggered retries. Configure ingress/client timeouts to accommodate that work; the API does not stream intermediate agent results.

## Development notes

- Dependencies are declared in `pyproject.toml`; the Qwen/PEFT runtime is optional and is installed with `uv sync --extra local-model --no-install-project`.
- `src.main:app` is the ASGI entry point used for local and Docker execution.
- The `tests/` suite mocks model weights and external service calls; run it with `uv sync --extra test --extra local-model --no-install-project` and `uv run pytest`.
- End-to-end verification requires the configured databases, Groq API, and Pylint MCP; research verification additionally requires DuckDuckGo MCP.
