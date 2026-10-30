import { cn } from "../../utils/cn"

export function PipelineNode({ stage, index, total, active = false, compact = false }) {
  const Icon = stage.icon
  const isLast = index === total - 1

  return (
    <li className="relative pl-9">
      {!isLast ? (
        <span
          className={cn(
            "absolute left-[13px] top-7 bottom-[-14px] w-px",
            active ? "bg-accent/45 animate-flow" : "bg-border",
          )}
          aria-hidden="true"
        />
      ) : null}

      <span
        className={cn(
          "absolute left-0 top-0.5 flex h-[27px] w-[27px] items-center justify-center rounded-md border transition-colors",
          active ? "border-accent/50 bg-accent-soft text-accent" : "border-border bg-surface-raised text-muted",
        )}
        aria-hidden="true"
      >
        <Icon size={13} />
      </span>

      <div className="pb-3.5">
        <p className={cn("text-[12.5px] font-semibold tracking-tight", active ? "text-foreground" : "text-foreground/85")}>
          {stage.label}
        </p>
        {!compact ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted text-pretty">{stage.description}</p> : null}
      </div>
    </li>
  )
}
