import { cn } from "../../utils/cn"

export function Panel({ className, children, ...props }) {
  return (
    <section
      className={cn("bg-surface border border-border rounded-card overflow-hidden", className)}
      {...props}
    >
      {children}
    </section>
  )
}

export function PanelHeader({ className, children, ...props }) {
  return (
    <header
      className={cn("flex items-center justify-between gap-3 px-4 py-3 border-b border-border", className)}
      {...props}
    >
      {children}
    </header>
  )
}

export function PanelTitle({ icon: Icon, children, hint }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {Icon ? <Icon size={15} className="text-accent shrink-0" aria-hidden="true" /> : null}
      <h2 className="text-sm font-semibold tracking-tight truncate">{children}</h2>
      {hint ? <span className="text-[11px] text-muted font-mono truncate">{hint}</span> : null}
    </div>
  )
}

export function SectionLabel({ className, children }) {
  return (
    <span className={cn("text-[10px] font-semibold uppercase tracking-[0.14em] text-muted", className)}>
      {children}
    </span>
  )
}
