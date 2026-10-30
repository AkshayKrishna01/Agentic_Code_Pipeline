import { Info, Workflow } from "lucide-react"
import { Panel, PanelHeader, PanelTitle } from "../ui/Panel"
import { PipelineNode } from "./PipelineNode"
import { PIPELINE_STAGES } from "./pipelineStages"

export function PipelineVisualizer({ active = false, compact = false }) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle icon={Workflow}>Pipeline Architecture</PanelTitle>
        {active ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent animate-flow">
            Running
          </span>
        ) : null}
      </PanelHeader>

      <div className="px-4 py-4">
        <ol className="list-none">
          {PIPELINE_STAGES.map((stage, index) => (
            <PipelineNode
              key={stage.id}
              stage={stage}
              index={index}
              total={PIPELINE_STAGES.length}
              active={active}
              compact={compact}
            />
          ))}
        </ol>

        <p className="mt-1 flex gap-2 rounded-md border border-border bg-surface-raised/60 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
          <Info size={13} className="mt-px shrink-0" aria-hidden="true" />
          <span className="text-pretty">
            Static architecture diagram. The API returns one final payload and does not expose per-agent state.
          </span>
        </p>
      </div>
    </Panel>
  )
}
