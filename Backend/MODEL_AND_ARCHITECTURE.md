# Model and Architecture Overview

This project is a multi-agent code generation and review pipeline built with Python, FastAPI, LangChain, LangGraph, PostgreSQL, and MCP tools.

## 1) High-level architecture

The application exposes a FastAPI endpoint that accepts a user prompt and sends it through a LangGraph-driven orchestration pipeline. The workflow contains these core stages:

1. Decision / routing node
2. Optional research node
3. Code generation node
4. Review node
5. Retry loop when the review indicates failure

The graph is compiled in `src/services/service.py` and uses a PostgreSQL checkpoint store for state persistence.

## 2) Actual model stack in this project

This project currently uses these models in practice:

| Purpose | Model | Source | Evidence |
| --- | --- | --- | --- |
| Code generation | `Qwen/Qwen2.5-Coder-0.5B-Instruct` | Local Hugging Face model with LoRA adapter | `src/settings/settings.py`, `src/agent/local_code_model.py` |
| Orchestrator / routing | `openai/gpt-oss-120b` | Groq via `ChatGroq` | `src/utils/helper.py`, `src/.env` |
| Research agent reasoning | `openai/gpt-oss-120b` | Groq via `ChatGroq` | `src/utils/helper.py` |
| Review agent reasoning | `openai/gpt-oss-120b` | Groq via `ChatGroq` | `src/utils/helper.py` |

### Important note

The codebase is not configured for AWS Bedrock. The active provider in the project is Groq, not Bedrock. The environment file and code both point to `GROQ_API_KEY` and `GROQ_MODEL`, and the helper uses `from langchain_groq import ChatGroq`.

---

## 3) How the app works

### 3.1 API entry point

A request is sent to:

`POST /api/v1/agentic/pipeline/code`

The route is defined in `src/routes/routes.py`.

The request body contains:

```json
{
  "user_query": "Write a Python function to add two numbers",
  "user_id": "example-user"
}
```

The endpoint validates the bearer token, builds the pipeline service, and calls the LangGraph workflow.

### 3.2 Graph orchestration

The workflow is built in `src/services/service.py`.

The graph contains:

- `decide` node: decides whether the input is `greet`, `research`, `code`, or `review`
- `research` node: calls the research agent and MCP tools
- `code` node: calls the code generation agent
- `review` node: calls the review agent

The state is stored as an `AgentState` in `src/models/models.py` and includes:

- `user_query`
- `code`
- `context`
- `review`
- `status`
- `route`
- `retries`
- `thread_id`

### 3.3 Routing logic

The `decide` node sends a prompt to the LLM and classifies the request. The allowed outputs are:

- `greet`
- `research`
- `code`
- `review`
- `invalid`

When the route is `code`, the graph goes to code generation. When the route is `research`, it first gathers context, then generates code. When the route is `review`, the user input is treated as review content.

---

## 4) Which models are used in each agent

### 4.1 Code generation agent

The code generation agent is in `src/agent/code_agent.py`.

It uses a local model loaded through `LocalCodeModel` from `src/agent/local_code_model.py`.

The model is defined by:

- `LOCAL_MODEL_BASE` = `Qwen/Qwen2.5-Coder-0.5B-Instruct`
- `LOCAL_MODEL_ADAPTER` = LoRA adapter directory

This is a Hugging Face local model loaded with Transformers and PEFT. The code uses `AutoTokenizer`, `AutoModelForCausalLM`, and `PeftModel`.

The generation flow is:

1. Build a prompt from the user request and research context
2. Convert the prompt into tokens with the tokenizer
3. Run generation with the local model
4. Sanitize the output (remove Markdown fences or surrounding explanation)
5. Validate the result using Python AST parsing
6. Return valid Python code only

This ensures the output is executable Python rather than a Markdown explanation block.

### 4.2 Orchestration LLM

The graph router uses `get_llm()` from `src/utils/helper.py`.

```python
return ChatGroq(
    model=model_name,
    api_key=api_key,
    temperature=temperature,
    max_tokens=max_tokens,
)
```

The active model is the Groq model defined by `GROQ_MODEL`, currently:

```env
GROQ_MODEL=openai/gpt-oss-120b
```

This model is used to decide the route of the workflow, not to generate code in the final answer.

### 4.3 Research agent

The research agent is in `src/agent/research_agent.py`.

It:

- creates a `MultiServerMCPClient`
- connects to a DuckDuckGo MCP server
- loads tools from the MCP server
- sends the research question to a LangChain agent with the Groq LLM

The relevant MCP config is:

```env
DUCK_DUCK_GO=http://127.0.0.1:8000/mcp
```

This makes the research node tool-augmented by MCP search capabilities, rather than using plain model memory alone.

### 4.4 Review agent

The review agent is in `src/agent/review_agent.py`.

It:

- writes the generated code to a temporary `.py` file
- connects to a pylint MCP server
- loads the available tools from that server
- sends the file to the review agent
- asks for a pass/fail result with a comment

The relevant config is:

```env
PYLINT_MCP_SERVER_URL=http://localhost:8001/mcp
```

The review node checks whether the review response contains the word `fail`. If so, it increments the retry counter and loops back to the research/code generation path until the retry limit is reached.

---

## 5) Provider configuration

The main provider used by the project is configured in `src/.env`:

```env
PROVIDER=groq
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-120b
```

This means the project is explicitly intended to use Groq-managed LLM endpoints for the orchestration and review/research steps.

The model helper in `src/utils/helper.py` confirms the provider selection:

```python
from langchain_groq import ChatGroq
```

---

## 6) MCP integration

The application uses external MCP servers for specialized tools.

### DuckDuckGo MCP

Used for research:

- `src/agent/research_agent.py`
- `settings.duckduckgo`

### Pylint MCP

Used for static review of generated Python code:

- `src/agent/review_agent.py`
- `settings.pylint_mcp_server_url`

These MCP servers are not built into the app itself. They must be running and reachable for the pipeline to work end-to-end.

---

## 7) PostgreSQL usage

The app uses PostgreSQL for two main purposes:

1. Application error logging
2. LangGraph checkpoint persistence

This is configured in:

- `src/constant/constant.py`
- `src/repository/database/database_connection.py`
- `src/services/service.py`

The graph is compiled with a `checkpointer` from:

```python
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
```

This allows the workflow state to be restored or tracked across execution steps.

---

## 8) Runtime flow: from HTTP request to final answer

The end-to-end flow looks like this:

```text
Client request
  -> FastAPI route
  -> Bearer token validation
  -> Build CodePipelineService
  -> LangGraph workflow starts
  -> decide node classifies request
  -> if needed: research node via DuckDuckGo MCP
  -> code generation node via local Qwen model
  -> review node via Pylint MCP + Groq LLM
  -> retry if review fails
  -> return final response
```

This is the app's core operational loop.

---

## 9) Summary of the actual implementation

This project currently uses:

- Local model for actual code synthesis: `Qwen/Qwen2.5-Coder-0.5B-Instruct`
- Groq-hosted model for orchestration and reasoning: `openai/gpt-oss-120b`
- DuckDuckGo MCP server for research tools
- Pylint MCP server for static review
- PostgreSQL for checkpointing + error storage
- LangGraph for workflow orchestration
- FastAPI for the API layer

The architecture is a hybrid model setup:

- local model for code generation
- cloud LLM for orchestration/reasoning
- external MCP tools for domain-specific capabilities
- persistent graph state in PostgreSQL

---

## 10) One key architectural clarification

If the goal is to describe this project as a Bedrock-based system, that would be inaccurate for the current code. The implementation in the repository is based on Groq and local Hugging Face inference, not AWS Bedrock.

This project is best described as:

`Python + FastAPI + LangChain + LangGraph + Groq + MCP + PostgreSQL`

with a local Qwen-based code model for generation and Groq-based LLMs for orchestrator/research/review tasks.
