export const EXAMPLE_PROMPTS = [
  {
    id: "csv-endpoint",
    intent: "code",
    title: "FastAPI CSV upload endpoint",
    prompt: "Write a Python FastAPI endpoint that accepts a CSV file and validates its contents.",
  },
  {
    id: "async-fetch",
    intent: "code",
    title: "Async multi-API fetcher",
    prompt: "Create a Python function that asynchronously fetches data from multiple APIs.",
  },
  {
    id: "review-add",
    intent: "review",
    title: "Review a Python function",
    prompt: "Review this Python function and identify potential code quality issues:\ndef add(a,b):\n    return a+b",
  },
  {
    id: "pg-pooling",
    intent: "research",
    title: "PostgreSQL connection pooling",
    prompt: "Research the best practices for connection pooling in PostgreSQL with Python.",
  },
  {
    id: "smtp-service",
    intent: "code",
    title: "SMTP email service class",
    prompt: "Write a Python service class for sending emails using an SMTP server.",
  },
]

export const INTENT_TONES = {
  code: "accent",
  review: "warning",
  research: "neutral",
  greeting: "neutral",
  invalid: "danger",
  error: "danger",
  text: "neutral",
}
