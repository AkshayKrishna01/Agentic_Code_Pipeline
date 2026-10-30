import { cn } from "../../utils/cn"

const TONES = {
  neutral: "bg-surface-raised text-muted border-border",
  accent: "bg-accent-soft text-accent border-accent/30",
  success: "bg-accent-soft text-accent border-accent/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  warning: "border-warning/30 text-warning",
}

export function Badge({ tone = "neutral", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
        TONES[tone] || TONES.neutral,
        className,
      )}
      style={tone === "warning" ? { backgroundColor: "color-mix(in oklch, var(--warning) 14%, transparent)" } : undefined}
      {...props}
    >
      {children}
    </span>
  )
}
