import { useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "./Button"
import { cn } from "../../utils/cn"

/** Mobile/tablet slide-over used to host the sidebars below `xl`. */
export function Drawer({ open, onClose, side = "left", title, className, children }) {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.()
    }

    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={cn("fixed inset-0 z-40", className)}>
      <div className="absolute inset-0 bg-black/65" onClick={onClose} role="presentation" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute top-0 bottom-0 w-[86vw] max-w-[340px] bg-surface flex flex-col",
          side === "left" ? "left-0 border-r border-border" : "right-0 border-l border-border",
        )}
      >
        <header className="flex items-center justify-between gap-3 px-4 h-14 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
            <X size={15} aria-hidden="true" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  )
}
