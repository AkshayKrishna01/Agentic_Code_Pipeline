import { cn } from "../../utils/cn"

export const CONNECTION = {
  unknown: "unknown",
  connected: "connected",
  offline: "offline",
  checking: "checking",
}

const CONFIG = {
  unknown: { label: "Not Connected", dot: "bg-muted", text: "text-muted" },
  connected: { label: "API Connected", dot: "bg-accent", text: "text-accent" },
  offline: { label: "API Offline", dot: "bg-danger", text: "text-danger" },
  checking: { label: "Contacting API", dot: "bg-warning animate-flow", text: "text-warning" },
}

/**
 * Connection state is inferred from real pipeline calls only — the backend has
 * no health endpoint, so nothing is probed speculatively.
 */
export function StatusIndicator({ status = CONNECTION.unknown, compact = false, className }) {
  const config = CONFIG[status] || CONFIG.unknown

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-2.5 py-1.5",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} aria-hidden="true" />
      <span className={cn("text-[11px] font-medium tracking-tight", config.text, compact && "sr-only")}>
        {config.label}
      </span>
    </div>
  )
}
