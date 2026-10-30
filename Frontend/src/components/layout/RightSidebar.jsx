import { Layers, Radio } from "lucide-react"
import { CopyButton } from "../ui/CopyButton"
import { Panel, PanelHeader, PanelTitle, SectionLabel } from "../ui/Panel"
import { StatusIndicator } from "../ui/StatusIndicator"
import { PipelineVisualizer } from "../pipeline/PipelineVisualizer"
import { TECH_STACK } from "../pipeline/pipelineStages"
import { formatDuration, formatTimestamp } from "../../utils/format"

export function RightSidebar({ loading, connection, apiBaseUrl, result, error }) {
  const requestId = result?.response?.request_id ?? error?.requestId ?? null
  const timestamp = result?.response?.data?.timestamp ?? error?.timestamp ?? null
  const httpStatus = result?.httpStatus ?? error?.status ?? null
  const durationMs = result?.durationMs ?? null

  return (
    <div className="flex flex-col gap-3 px-3.5 py-3.5">
      <Panel>
        <PanelHeader>
          <PanelTitle icon={Radio}>Connection</PanelTitle>
        </PanelHeader>
        <div className="flex flex-col gap-3 px-4 py-3.5">
          <StatusIndicator status={loading ? "checking" : connection} className="w-full" />
          <div>
            <SectionLabel>Endpoint</SectionLabel>
            <p className="mt-1 font-mono text-[11px] leading-relaxed break-all text-foreground/85">
              POST {apiBaseUrl}/pipeline/code
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle icon={Layers}>Request Metadata</PanelTitle>
        </PanelHeader>
        <div className="flex flex-col gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <SectionLabel>Request ID</SectionLabel>
            <div className="mt-1 flex items-start gap-1">
              <span className="min-w-0 flex-1 font-mono text-[11px] leading-relaxed break-all text-foreground/85">
                {requestId || "—"}
              </span>
              {requestId ? <CopyButton value={requestId} label="Copy request ID" /> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionLabel>HTTP</SectionLabel>
              <p className="mt-1 font-mono text-[11.5px] tabular-nums text-foreground/85">{httpStatus ?? "—"}</p>
            </div>
            <div>
              <SectionLabel>Round trip</SectionLabel>
              <p className="mt-1 font-mono text-[11.5px] tabular-nums text-foreground/85">
                {durationMs !== null ? formatDuration(durationMs) : "—"}
              </p>
            </div>
          </div>

          <div>
            <SectionLabel>Timestamp</SectionLabel>
            <p className="mt-1 text-[11.5px] text-foreground/85">{timestamp ? formatTimestamp(timestamp) : "—"}</p>
          </div>
        </div>
      </Panel>

      <PipelineVisualizer active={loading} />

      <Panel>
        <PanelHeader>
          <PanelTitle icon={Layers}>Backend Stack</PanelTitle>
        </PanelHeader>
        <div className="px-4 py-3.5">
          <ul className="flex flex-wrap gap-1.5">
            {TECH_STACK.map((item) => (
              <li
                key={item}
                className="rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/80"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    </div>
  )
}
