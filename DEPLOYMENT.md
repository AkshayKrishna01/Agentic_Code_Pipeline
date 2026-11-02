# CodePilot AI Deployment Guide

This guide describes a low-cost deployment using Groq for hosted code generation and local Qwen support for development.

The Render deployment uses one Docker Web Service built from the repository root. That container runs FastAPI, the required Pylint MCP service, and the optional DuckDuckGo MCP service as supervised child processes.

## 1. Recommended architecture

```text
Browser
  |
  v
Vercel or Netlify
  React/Vite frontend
  |
  v
Render Web Service
  FastAPI backend
  |
  +--> Neon PostgreSQL
  +--> Groq API
  +--> DuckDuckGo MCP endpoint
  +--> Pylint MCP endpoint
```

Use the hosted mode for deployment:

```env
CODE_GENERATION_PROVIDER=groq
```

Use the local mode only on a machine that has the Qwen model dependencies and adapter:

```env
CODE_GENERATION_PROVIDER=local
```

The deployed backend does not need the Qwen adapter, PyTorch, Transformers, or a GPU when it uses `groq`.

## 2. Required services

| Service | Purpose | Suggested free option |
| --- | --- | --- |
| Frontend | Hosts the React application | Vercel, Netlify, or GitHub Pages |
| Backend | Runs FastAPI and LangGraph | Render or another persistent container host |
| PostgreSQL | Application errors and LangGraph checkpoints | Neon or Supabase |
| LLM | Routing, research, generation, and review reasoning | Groq |
| Pylint MCP | Static analysis tools | A reachable deployment of `pylint/pylint_mcp` |
| DuckDuckGo MCP | Research tools | A reachable compatible MCP service |

The DuckDuckGo MCP service is not included in this repository. The Pylint MCP implementation is included, but it must be reachable by the backend.

## 3. Create PostgreSQL on Neon

1. Create a Neon project.
2. Create a database, or use the default database.
3. Copy the host, port, database name, username, and password from the Neon connection details.
4. Configure both logical database names in the backend.

The current application uses two logical roles:

- `DB_NAME` stores application error logs.
- `DB_NAME_CHECKPOINT` stores LangGraph checkpoint tables.

They can be the same Neon database:

```env
DB_HOST=ep-example.region.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USERNAME=neondb_owner
DB_PASSWORD=replace-with-neon-password
DB_NAME_CHECKPOINT=neondb
```

The database user must be allowed to create tables, indexes, and checkpoint tables.

### PostgreSQL SSL

Managed PostgreSQL providers commonly require TLS. If Neon rejects the connection with an SSL error, add SSL-mode support to the connection configuration before deployment and set:

```env
DB_SSLMODE=require
```

The setting must be applied to both the SQLAlchemy application connection and the LangGraph checkpoint connection. Do not disable certificate verification in production.

## 4. Configure the backend environment

Do not commit a production `.env` file. Add these values in the deployment platform's secret/environment-variable UI.

For local development, create an untracked file:

```powershell
Copy-Item Backend\src\.env.example Backend\src\.env
```

### Groq deployment environment

```env
DB_HOST=your-neon-host
DB_PORT=5432
DB_NAME=neondb
DB_USERNAME=your-neon-user
DB_PASSWORD=your-neon-password
DB_NAME_CHECKPOINT=neondb

HOST=0.0.0.0
PORT=8080
LOG_LEVEL=INFO

API_AUTH_TOKEN=use-a-random-secret-at-least-32-characters
CORS_ORIGINS=https://your-frontend.vercel.app

GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b
CODE_GENERATION_PROVIDER=groq

DUCK_DUCK_GO=http://127.0.0.1:8000/mcp
PYLINT_MCP_SERVER_URL=http://127.0.0.1:8001/mcp
PYLINT_WORKSPACE=/tmp/code-pipeline-review
```

Generate a token locally:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Do not place `GROQ_API_KEY`, `DB_PASSWORD`, or `API_AUTH_TOKEN` in frontend variables. Anything beginning with `VITE_` is delivered to the browser.

### Local Qwen environment

For local Qwen generation, use the same database and service variables but set:

```env
CODE_GENERATION_PROVIDER=local
LOCAL_MODEL_BASE=Qwen/Qwen2.5-Coder-0.5B-Instruct
LOCAL_MODEL_ADAPTER=adapter
LOCAL_MODEL_DEVICE=cpu
LOCAL_MODEL_MAX_NEW_TOKENS=768
LOCAL_MODEL_TIMEOUT=180
```

The adapter path is resolved relative to `Backend/` when it is not absolute.

## 5. Deploy the backend to Render

1. Push the repository to GitHub.
2. Create a Render **Web Service** from the repository.
3. Select Docker as the runtime.
4. Use the repository root as the Render root directory.
5. Set the Dockerfile path to:

```text
Backend/Dockerfile
```

6. Add the environment variables from the Groq deployment section.
7. Set the health check path to:

```text
/health/live
```

The Dockerfile copies the backend project files and starts:

```text
uvicorn src.main:app --host 0.0.0.0 --port 8080
```

The default image is Groq-only. It does not install the optional `local-model` dependency group.

If building a local-Qwen image instead:

```powershell
docker build --build-arg INSTALL_LOCAL_MODEL=true -t codepilot-backend Backend
```

Do not use this larger image on a free hosted service unless it has sufficient memory.

### Render startup behavior

At startup the API:

1. Validates required environment variables.
2. Loads Qwen only when `CODE_GENERATION_PROVIDER=local`.
3. Connects to the application database.
4. Creates the application schema.
5. Initializes LangGraph checkpoint tables.

If any required startup dependency fails, the service will not become ready.

Test the deployment:

```text
GET https://your-service.onrender.com/health/live
GET https://your-service.onrender.com/health/ready
```

Expected responses:

```json
{"status":"ok"}
```

```json
{"status":"ready"}
```

Free Render services may sleep after inactivity. The first request after sleeping can be slow or time out.

## 6. Deploy the Pylint MCP service

The backend's review agent writes a temporary Python file and sends its filesystem path to the Pylint MCP service. The Pylint service must be able to read that exact path. In the Render deployment, both processes run in the same container and share `/tmp/code-pipeline-review`.

### Same-machine deployment

If both services run on one machine, use a shared directory:

```text
/tmp/code-pipeline-review
```

Set the same path in both services:

```env
PYLINT_WORKSPACE=/tmp/code-pipeline-review
```

### Separate cloud services

A Render backend and a separate Render Pylint service do not share a filesystem. In that arrangement, the current file-path protocol fails because the path exists only inside the backend container. The approved deployment does not create a separate Pylint service.

Use one of these designs:

1. Run the backend and Pylint MCP in the same container or host.
2. Change the protocol to send source text to the Pylint service.
3. Store temporary files in shared object storage and send an object URL.
4. Run Pylint directly inside the backend instead of using MCP.

For a free deployment, running Pylint directly in the backend is the simplest reliable option. Until that change is made, deploy the backend and Pylint MCP together or keep both on the same local machine.

To run the included MCP service locally:

```powershell
cd pylint\pylint_mcp
uv sync
uv run python src\main.py
```

The service uses streamable HTTP, binds to localhost only, and exposes:

```text
http://localhost:8000/mcp
```

Use the actual exposed port in:

```env
PYLINT_MCP_SERVER_URL=http://127.0.0.1:8001/mcp
```

## 7. Configure DuckDuckGo MCP

The research agent creates a streamable HTTP MCP client using `DUCK_DUCK_GO`:

```env
DUCK_DUCK_GO=http://127.0.0.1:8000/mcp
```

The internal endpoint must:

- Be reachable from the backend host.
- Support streamable HTTP MCP transport.
- Expose the search tools expected by the research agent.
- Use HTTPS when accessed from a hosted backend.

The Render image resolves and starts the exact command below once at container startup:

```sh
uvx duckduckgo-mcp-server --transport streamable-http --host 127.0.0.1 --port 8000
```

The repository does not contain the DuckDuckGo MCP source; `uvx` resolves the package from its package index. The supervisor performs an MCP `initialize` and `list_tools` check. DuckDuckGo is nonfatal: if it cannot start or pass readiness, FastAPI still starts and research requests report an availability error.

The production image configures `UV_TOOL_DIR=/opt/uv-tools` and grants the
unprivileged container user write access to that directory. This is required
because `uvx` installs its runtime tool there; using its default `/.local`
directory causes `Permission denied` errors on Render.

If the research MCP is unavailable, research-routed requests fail with a logged availability error. Code-only requests may still work if the classifier selects `code` and the review service is available.

## 8. Build and run the combined Docker image

The Docker build context must be the repository root so the image can copy both `Backend/` and `pylint/pylint_mcp/`:

```powershell
docker build -f Backend\Dockerfile -t codepilot-backend .
docker run --rm -p 8080:8080 --env-file Backend\deployment.env codepilot-backend
```

The image keeps the two Python projects isolated. Each project is installed from its own `pyproject.toml` and `uv.lock`; their lockfiles are not merged. The production image does not install the optional Qwen dependency group.

Startup sequence:

1. Create `/tmp/code-pipeline-review`.
2. Start Pylint MCP on `127.0.0.1:8001`.
3. Perform MCP `initialize` and `list_tools`; failure stops the container.
4. Start DuckDuckGo MCP with the exact `uvx` command; failure is logged but does not stop the container.
5. Start FastAPI on `0.0.0.0:$PORT`.
6. Monitor processes and clean up all children on SIGTERM or SIGINT.

Only FastAPI's port is exposed publicly. MCP ports are internal.

## 9. Deploy the frontend to Vercel

1. Create a Vercel project from the GitHub repository.
2. Set the root directory to:

```text
Frontend
```

3. Set the build command to:

```text
pnpm build
```

4. Set the output directory to:

```text
dist
```

5. Add:

```env
VITE_API_BASE_URL=https://your-service.onrender.com/api/v1/agentic
```

For a private demo only, you may add:

```env
VITE_API_AUTH_TOKEN=the-backend-api-token
```

This token is visible in the browser bundle. Do not treat it as a secure production secret. A public deployment should use a server-side authentication or proxy layer.

After obtaining the Vercel URL, update the backend:

```env
CORS_ORIGINS=https://your-project.vercel.app
```

Redeploy the backend after changing CORS.

## 10. Local development commands

### Local Qwen backend

```powershell
cd Backend
uv sync --extra local-model --no-install-project
uv run uvicorn src.main:app --host 127.0.0.1 --port 8080
```

### Groq-only backend

```powershell
cd Backend
uv sync --no-install-project
uv run uvicorn src.main:app --host 127.0.0.1 --port 8080
```

Set `CODE_GENERATION_PROVIDER=groq` in `Backend/src/.env` before starting.

### Frontend

```powershell
cd Frontend
pnpm install --frozen-lockfile
pnpm dev
```

Set:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1/agentic
```

## 11. Deployment troubleshooting

### `Missing required environment variables`

Check that all required variables are configured in the backend service, not only in the frontend.

Required values include:

```text
DB_HOST
DB_NAME
DB_USERNAME
DB_PASSWORD
DB_NAME_CHECKPOINT
GROQ_API_KEY
PYLINT_MCP_SERVER_URL
API_AUTH_TOKEN
```

### `API_AUTH_TOKEN must contain at least 32 characters`

Generate a new token:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Set the same token only in trusted clients. Avoid exposing it in a public Vite build.

### `Database unavailable` or connection timeout

Check:

- Neon host is copied exactly.
- Port is `5432`.
- Database name and username are correct.
- Neon project is active.
- The database accepts external connections.
- SSL mode is configured if the provider requires it.
- The database user can create tables.

Use `/health/ready` to distinguish a live process from a database-ready process.

### Backend starts and immediately exits in local mode

Check:

- `CODE_GENERATION_PROVIDER=local`.
- `Backend/adapter/adapter_config.json` exists.
- `Backend/adapter/adapter_model.safetensors` exists.
- The Qwen optional dependencies were installed.
- The host has enough RAM or CUDA memory.
- Hugging Face is reachable on first startup.

For hosted deployment, switch to:

```env
CODE_GENERATION_PROVIDER=groq
```

### `ModuleNotFoundError: torch`, `transformers`, or `peft`

You selected local mode without installing the optional dependency group:

```powershell
cd Backend
uv sync --extra local-model --no-install-project
```

Do not install this extra for Groq-only deployment.

### CORS errors in the browser

Set the exact frontend origin:

```env
CORS_ORIGINS=https://your-project.vercel.app
```

Do not include a trailing API path. Do not use `*` with a protected application.

### `401 A valid bearer token is required`

The frontend token and backend token do not match, or the frontend was built before the token variable was changed. Rebuild the frontend after changing `VITE_API_AUTH_TOKEN`.

### `502`, `504`, or request timeout

One request can call Groq several times, MCP tools, Pylint, and review retries. Free platforms may impose short request limits. Check backend logs and reduce:

```env
LOCAL_MODEL_MAX_NEW_TOKENS=...
LOCAL_MODEL_TIMEOUT=...
```

For Groq mode, the main causes are usually a sleeping backend, Groq rate limits, MCP latency, or review retries.

### Research requests fail

Check that the in-container `DUCK_DUCK_GO` endpoint is `http://127.0.0.1:8000/mcp` and that the DuckDuckGo process passed the supervisor's MCP readiness check. Research remains unavailable when that process cannot start.

### Review requests fail

Check that `PYLINT_MCP_SERVER_URL=http://127.0.0.1:8001/mcp` is reachable and that the Pylint service can read `PYLINT_WORKSPACE`. The approved Render image runs both processes in one container, so the file path is shared.

## 12. Security checklist

- Keep `.env` files out of Git.
- Store secrets in Render/Vercel secret settings.
- Use a unique random `API_AUTH_TOKEN`.
- Use TLS URLs for all hosted services.
- Restrict `CORS_ORIGINS` to trusted frontend origins.
- Do not put database passwords or Groq keys in `VITE_*` variables.
- Keep the Pylint workspace private.
- Do not execute generated code.
- Use a restricted PostgreSQL user rather than an administrator account.
- Monitor free-tier quotas and rate limits.

## 13. Recommended first deployment

For the first working hosted demo:

1. Create Neon PostgreSQL.
2. Deploy the combined root-context Docker service with `CODE_GENERATION_PROVIDER=groq`.
3. Confirm `/health/live`.
4. Confirm `/health/ready`.
5. Confirm the required in-container Pylint MCP passes protocol readiness.
6. Confirm the optional in-container DuckDuckGo MCP passes protocol readiness, or accept that research requests will be unavailable.
7. Deploy the frontend.
8. Configure CORS with the final frontend URL.
9. Send a code-generation request and inspect backend logs before testing research and review flows.
