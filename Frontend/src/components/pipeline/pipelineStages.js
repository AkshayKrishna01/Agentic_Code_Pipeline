import { Bot, CheckCircle2, Code2, FileSearch, Send, Sparkles } from "lucide-react"

/**
 * Static description of the backend architecture. The API returns a single
 * final payload, so these stages are documentation — never live telemetry.
 */
export const PIPELINE_STAGES = [
  {
    id: "request",
    label: "User Request",
    icon: Send,
    description: "The query and session user ID are posted to the pipeline endpoint.",
  },
  {
    id: "orchestrator",
    label: "Orchestrator",
    icon: Bot,
    description: "Classifies the request and routes workflow execution.",
  },
  {
    id: "research",
    label: "Research Agent",
    icon: FileSearch,
    description: "Provides contextual technical information.",
  },
  {
    id: "code",
    label: "Code Agent",
    icon: Code2,
    description: "Generates production-oriented Python code.",
  },
  {
    id: "review",
    label: "Review Agent",
    icon: CheckCircle2,
    description: "Validates generated code using pylint.",
  },
  {
    id: "response",
    label: "Final Response",
    icon: Sparkles,
    description: "A single JSON payload returns to this client.",
  },
]

export const TECH_STACK = [
  "FastAPI",
  "LangGraph",
  "LangChain",
  "AWS Bedrock / Claude",
  "MCP",
  "PostgreSQL",
  "SQLAlchemy",
  "Pydantic",
  "Pylint",
]

export const INTENT_CATEGORIES = ["greet", "code", "research", "review", "invalid"]
