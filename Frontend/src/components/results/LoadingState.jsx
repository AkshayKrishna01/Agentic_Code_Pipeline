import { Loader2, X } from "lucide-react"
import { Button } from "../ui/Button"
import { Panel } from "../ui/Panel"
import { PIPELINE_STAGES } from "../pipeline/pipelineStages"
import { useElapsed } from "../../hooks/useElapsed"
import { formatDuration, truncate } from "../../utils/format"

export function LoadingState({ query, onCancel }) {
  const elapsed = useElapsed(true)

  return (
    <Panel className="animate-fade-rise">
      <div className="px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Loader2 size={16} className="text-accent animate-spin shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Running multi-agent pipeline…</p>
              <p className="mt-0.5 text-[11.5px] text-muted truncate font-mono">{truncate(query, 84)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[11px] text-muted tabular-nums">{formatDuration(elapsed)}</span>
            {onCancel ? (
              <Button variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Cancel request">
                <X size={14} aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>

        <ol className="mt-5 flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-label="Conceptual pipeline stages">
          {PIPELINE_STAGES.map((stage, index) => (
            <li key={stage.id} className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 rounded border border-accent/25 bg-accent-soft px-2 py-1 animate-flow"
                style={{ animationDelay: `${index * 220}ms` }}
              >
                <stage.icon size={11} className="text-accent" aria-hidden="true" />
                <span className="text-[10.5px] font-medium text-foreground/85">{stage.label}</span>
              </span>
              {index < PIPELINE_STAGES.length - 1 ? (
                <span className="text-muted text-[11px]" aria-hidden="true">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        <p className="mt-4 text-[11px] leading-relaxed text-muted text-pretty">
          The request is synchronous. This sequence is the documented backend architecture, not live agent telemetry —
          the client receives a single response when the workflow completes.
        </p>
      </div>
    </Panel>
  )
}
