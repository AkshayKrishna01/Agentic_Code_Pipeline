import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "./Button"
import { cn } from "../../utils/cn"

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, description, children, footer, className }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const panel = panelRef.current
    panel?.querySelector(FOCUSABLE)?.focus()

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose?.()
        return
      }

      if (event.key !== "Tab" || !panel) return

      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((node) => node.offsetParent !== null)
      if (nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full sm:max-w-lg bg-surface border border-border rounded-t-xl sm:rounded-card",
          "shadow-2xl shadow-black/40 animate-fade-rise max-h-[92vh] flex flex-col",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted leading-relaxed">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close dialog">
            <X size={15} aria-hidden="true" />
          </Button>
        </header>

        <div className="px-5 py-4 overflow-y-auto scrollbar-thin flex-1">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border bg-surface-raised/40">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
