/**
 * Helpers that interpret the single `data.output` string returned by the
 * backend. Everything here is a best-effort presentation decision made on the
 * client — the API does not tell us which agent produced the output.
 */

const FENCE_RE = /```([a-zA-Z0-9_+-]*)\r?\n([\s\S]*?)```/g

const PY_SIGNALS = [
  /^\s*def\s+\w+\s*\(/m,
  /^\s*class\s+\w+\s*[(:]/m,
  /^\s*(from|import)\s+[\w.]+/m,
  /^\s*@\w+/m,
  /^\s*if\s+__name__\s*==/m,
  /^\s*async\s+def\s+/m,
]

/** Split output into ordered text / code segments based on fenced blocks. */
export function parseSegments(output) {
  const text = String(output ?? "")
  if (!text.trim()) return []

  const segments = []
  let lastIndex = 0
  FENCE_RE.lastIndex = 0

  let match = FENCE_RE.exec(text)
  while (match !== null) {
    const before = text.slice(lastIndex, match.index)
    if (before.trim()) segments.push({ type: "text", content: before.trim() })

    const language = (match[1] || "").toLowerCase() || guessLanguage(match[2])
    segments.push({ type: "code", language, content: stripTrailingNewline(match[2]) })

    lastIndex = match.index + match[0].length
    match = FENCE_RE.exec(text)
  }

  const tail = text.slice(lastIndex)
  if (tail.trim()) {
    if (segments.length === 0 && looksLikePython(tail)) {
      segments.push({ type: "code", language: "python", content: stripTrailingNewline(tail) })
    } else {
      segments.push({ type: "text", content: tail.trim() })
    }
  }

  return segments
}

function stripTrailingNewline(value) {
  return String(value ?? "").replace(/\s+$/, "")
}

function guessLanguage(snippet) {
  return looksLikePython(snippet) ? "python" : "text"
}

/** Heuristic: does this blob read like raw Python source rather than prose? */
export function looksLikePython(value) {
  const text = String(value ?? "")
  if (!text.trim()) return false

  const signalCount = PY_SIGNALS.reduce((total, re) => (re.test(text) ? total + 1 : total), 0)
  if (signalCount === 0) return false

  const lines = text.split("\n").filter((line) => line.trim())
  if (lines.length === 0) return false

  const codeish = lines.filter((line) =>
    /[:=(){}[\]]|^\s{2,}\S|^\s*(#|@|def |class |return |import |from )/.test(line),
  ).length

  // Prose with a single stray colon should not be treated as a code file.
  return codeish / lines.length >= 0.5
}

/**
 * Classify the response for presentation purposes only.
 * Returns one of: "code" | "review" | "research" | "greeting" | "invalid" | "text".
 */
export function classifyOutput(output, userQuery = "") {
  const text = String(output ?? "")
  const trimmed = text.trim()
  if (!trimmed) return "text"

  const lower = trimmed.toLowerCase()
  const query = String(userQuery || "").toLowerCase()

  if (
    /\b(invalid|could not be processed|cannot process|not supported|unsupported request|out of scope|unable to classify)\b/.test(
      lower,
    ) &&
    trimmed.length < 400
  ) {
    return "invalid"
  }

  const segments = parseSegments(text)
  const hasCode = segments.some((segment) => segment.type === "code")

  const reviewSignals =
    /\b(pylint|code review|review result|rated at|convention|refactor|missing docstring|c0\d{3}|w\d{4}|r\d{4}|quality gate)\b/.test(
      lower,
    ) || /\breview\b/.test(query)

  if (reviewSignals && (hasCode || /\breview\b/.test(lower) || /\bpylint\b/.test(lower))) {
    return "review"
  }

  if (hasCode) return "code"

  if (
    trimmed.length < 240 &&
    /\b(hello|hi there|hey|greetings|welcome|how can i (help|assist)|i'm your|i am your)\b/.test(lower)
  ) {
    return "greeting"
  }

  if (/\bresearch\b/.test(query) || /\b(explain|best practice|best practices|overview|compare)\b/.test(query)) {
    return "research"
  }

  return "text"
}

const KIND_LABELS = {
  code: "Code",
  review: "Review",
  research: "Research",
  greeting: "Greeting",
  invalid: "Invalid",
  text: "Response",
  error: "Error",
}

export function kindLabel(kind) {
  return KIND_LABELS[kind] || "Response"
}

/** Concatenate every code segment so the download button yields one .py file. */
export function collectCode(segments) {
  return segments
    .filter((segment) => segment.type === "code")
    .map((segment) => segment.content)
    .join("\n\n")
}

/**
 * Extract a pylint-style score ONLY when the backend actually returned one.
 * Never fabricate a value.
 */
export function extractScore(output) {
  const text = String(output ?? "")
  const patterns = [
    /rated at\s*(-?\d+(?:\.\d+)?)\s*\/\s*10/i,
    /pylint\s*score\s*[:=]\s*(-?\d+(?:\.\d+)?)/i,
    /score\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*\/\s*10/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      const value = Number.parseFloat(match[1])
      if (Number.isFinite(value)) return value
    }
  }

  return null
}
