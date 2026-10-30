import { useEffect, useMemo, useState } from "react"
import { Download, Maximize2, Minimize2, WrapText } from "lucide-react"
import { Button } from "../ui/Button"
import { CopyButton } from "../ui/CopyButton"
import { cn } from "../../utils/cn"
import { downloadTextFile } from "../../utils/format"
import { tokenizeLines } from "../../utils/highlight"

const EXTENSIONS = {
  python: "py",
  py: "py",
  python3: "py",
  javascript: "js",
  typescript: "ts",
  json: "json",
  bash: "sh",
  shell: "sh",
  sql: "sql",
  yaml: "yaml",
}

/** Read-only viewer. No execution, no editing, no fake terminal. */
export function CodeViewer({ code, language = "python", filename, className }) {
  const [wrap, setWrap] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const lines = useMemo(() => tokenizeLines(code, language), [code, language])
  const displayLanguage = language && language !== "text" ? language : "plaintext"
  const extension = EXTENSIONS[language] || "txt"
  const downloadName = filename || `codepilot-output.${extension}`

  useEffect(() => {
    if (!fullscreen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setFullscreen(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [fullscreen])

  const gutterWidth = `${String(lines.length).length + 1}ch`

  const body = (
    <div
      className={cn(
        "bg-background border border-border rounded-card overflow-hidden flex flex-col",
        fullscreen ? "h-full" : "",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface-raised/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[11px] text-accent uppercase tracking-wider">{displayLanguage}</span>
          <span className="text-[11px] text-muted font-mono truncate">
            {lines.length} {lines.length === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setWrap((value) => !value)}
            aria-pressed={wrap}
            title={wrap ? "Disable word wrap" : "Enable word wrap"}
            aria-label={wrap ? "Disable word wrap" : "Enable word wrap"}
          >
            <WrapText size={13} className={wrap ? "text-accent" : undefined} aria-hidden="true" />
          </Button>
          <CopyButton value={code} label="Copy code" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => downloadTextFile(downloadName, code)}
            title={`Download ${downloadName}`}
            aria-label={`Download ${downloadName}`}
          >
            <Download size={13} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setFullscreen((value) => !value)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            aria-label={fullscreen ? "Exit fullscreen" : "View code fullscreen"}
          >
            {fullscreen ? <Minimize2 size={13} aria-hidden="true" /> : <Maximize2 size={13} aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "scrollbar-thin flex-1",
          fullscreen ? "overflow-auto" : "overflow-auto max-h-[32rem]",
          wrap ? "overflow-x-hidden" : "overflow-x-auto",
        )}
        tabIndex={0}
        role="region"
        aria-label={`${displayLanguage} code, read only`}
      >
        <pre className={cn("font-mono text-[12.5px] leading-[1.65] py-3", wrap ? "whitespace-pre-wrap" : "w-max min-w-full")}>
          <code>
            {lines.map((tokens, lineIndex) => (
              <span key={lineIndex} className="flex hover:bg-surface-raised/40">
                <span
                  className="shrink-0 select-none text-right pr-3 pl-3 text-muted/60 sticky left-0 bg-background"
                  style={{ width: `calc(${gutterWidth} + 1.5rem)` }}
                  aria-hidden="true"
                >
                  {lineIndex + 1}
                </span>
                <span className={cn("pr-4", wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre")}>
                  {tokens.length === 0 ? "\u200b" : null}
                  {tokens.map((token, tokenIndex) => (
                    <span key={tokenIndex} className={token.kind === "plain" ? undefined : `tok-${token.kind}`}>
                      {token.text}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  )

  if (!fullscreen) return body

  return (
    <div className="fixed inset-0 z-50 bg-background/95 p-3 sm:p-6 flex flex-col">
      <div className="flex-1 min-h-0">{body}</div>
    </div>
  )
}
