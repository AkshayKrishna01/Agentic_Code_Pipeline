import { Markdown } from "../ui/Markdown"
import { CodeViewer } from "./CodeViewer"

/**
 * Renders the backend `output` string exactly as received, only deciding how
 * each segment is displayed (code viewer vs. readable text).
 */
export function OutputRenderer({ segments, filenameBase = "codepilot-output" }) {
  if (!segments || segments.length === 0) {
    return <p className="text-sm text-muted italic">The backend returned an empty output field.</p>
  }

  let codeIndex = 0

  return (
    <div className="flex flex-col gap-4">
      {segments.map((segment, index) => {
        if (segment.type === "code") {
          codeIndex += 1
          const suffix = codeIndex > 1 ? `-${codeIndex}` : ""
          return (
            <CodeViewer
              key={`code-${index}`}
              code={segment.content}
              language={segment.language || "python"}
              filename={`${filenameBase}${suffix}.${segment.language === "python" ? "py" : "txt"}`}
            />
          )
        }

        return <Markdown key={`text-${index}`}>{segment.content}</Markdown>
      })}
    </div>
  )
}
