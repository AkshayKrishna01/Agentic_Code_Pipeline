import { useCallback, useEffect, useRef, useState } from "react"
import { Eraser, Lightbulb, Loader2, Play } from "lucide-react"
import { Button } from "../ui/Button"
import { Panel } from "../ui/Panel"
import { ExamplePrompts } from "./ExamplePrompts"
import { cn } from "../../utils/cn"

const MAX_CHARS = 8000

export function RequestComposer({ value, onChange, onSubmit, onClear, loading, disabled }) {
  const [showExamples, setShowExamples] = useState(false)
  const textareaRef = useRef(null)

  const canSubmit = value.trim().length > 0 && !loading && !disabled

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = "auto"
    node.style.height = `${Math.min(Math.max(node.scrollHeight, 116), 360)}px`
  }, [value])

  const handleKeyDown = useCallback(
    (event) => {
      // Respect CJK IME composition before treating Enter as submit.
      if (event.nativeEvent?.isComposing || event.keyCode === 229) return

      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        if (canSubmit) onSubmit?.()
      }
    },
    [canSubmit, onSubmit],
  )

  const handleSelectExample = useCallback(
    (prompt) => {
      onChange?.(prompt)
      setShowExamples(false)
      textareaRef.current?.focus()
    },
    [onChange],
  )

  return (
    <div className="flex flex-col gap-3">
      <Panel className={cn("transition-colors", loading && "border-accent/30")}>
        <label htmlFor="request-composer" className="sr-only">
          Describe what you want to build, research, or review
        </label>
        <textarea
          id="request-composer"
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange?.(event.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build, research, or review..."
          spellCheck="false"
          disabled={loading}
          className={cn(
            "w-full resize-none bg-transparent px-4 py-3.5 font-mono text-[13px] leading-relaxed",
            "placeholder:text-muted/70 focus:outline-none disabled:opacity-60",
          )}
          style={{ minHeight: "116px" }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExamples((current) => !current)}
              aria-expanded={showExamples}
              aria-controls="composer-examples"
            >
              <Lightbulb size={13} aria-hidden="true" />
              Examples
            </Button>
            <Button variant="ghost" size="sm" onClick={onClear} disabled={!value || loading}>
              <Eraser size={13} aria-hidden="true" />
              Clear
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline font-mono text-[10.5px] text-muted tabular-nums">
              {value.length}/{MAX_CHARS}
            </span>
            <span className="hidden md:inline text-[10.5px] text-muted">
              <kbd className="font-mono rounded border border-border bg-surface-raised px-1 py-0.5">⌘</kbd>
              <span className="mx-0.5">+</span>
              <kbd className="font-mono rounded border border-border bg-surface-raised px-1 py-0.5">↵</kbd>
            </span>
            <Button variant="primary" size="md" onClick={onSubmit} disabled={!canSubmit}>
              {loading ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Play size={13} aria-hidden="true" />
              )}
              {loading ? "Running" : "Generate"}
            </Button>
          </div>
        </div>
      </Panel>

      {showExamples ? (
        <div id="composer-examples" className="animate-fade-rise">
          <ExamplePrompts onSelect={handleSelectExample} />
        </div>
      ) : null}
    </div>
  )
}
