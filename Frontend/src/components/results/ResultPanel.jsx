import { useMemo } from "react"
import { CircleSlash, MessageSquare, RefreshCw, Terminal } from "lucide-react"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { Panel, PanelHeader, PanelTitle, SectionLabel } from "../ui/Panel"
import { OutputRenderer } from "./OutputRenderer"
import { RequestMetadata } from "./RequestMetadata"
import { ResearchPanel } from "./ResearchPanel"
import { ReviewPanel } from "./ReviewPanel"
import { INTENT_TONES } from "../request/promptData"
import { classifyOutput, extractScore, kindLabel, parseSegments } from "../../utils/output"
import { truncate } from "../../utils/format"

export function ResultPanel({ result, onRetry }) {
  const { response, query, httpStatus, durationMs } = result

  const output = response?.data?.output ?? ""
  const segments = useMemo(() => parseSegments(output), [output])
  const kind = useMemo(() => classifyOutput(output, query), [output, query])
  const score = useMemo(() => (kind === "review" ? extractScore(output) : null), [kind, output])

  const requestId = response?.request_id ?? null
  const timestamp = response?.data?.timestamp ?? null
  const backendMessage = response?.message ?? null
  const status = response?.status ?? "success"

  return (
    <div className="flex flex-col gap-4 animate-fade-rise">
      <Panel>
        <PanelHeader>
          <PanelTitle icon={Terminal}>Pipeline Result</PanelTitle>
          <div className="flex items-center gap-2">
            <Badge tone={INTENT_TONES[kind] || "neutral"}>{kindLabel(kind)}</Badge>
            <Badge tone={status === "success" ? "success" : "danger"}>{status}</Badge>
          </div>
        </PanelHeader>

        <div className="px-4 py-4 flex flex-col gap-4">
          {query ? (
            <div>
              <SectionLabel>Submitted query</SectionLabel>
              <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-muted text-pretty">
                {truncate(query, 260)}
              </p>
            </div>
          ) : null}

          <RequestMetadata
            status={status}
            httpStatus={httpStatus ?? response?.status_code ?? null}
            requestId={requestId}
            timestamp={timestamp}
            durationMs={durationMs}
          />

          {backendMessage ? (
            <p className="border-t border-border pt-3 text-[11.5px] text-muted">
              <span className="font-semibold uppercase tracking-[0.1em] text-[10px]">Backend message</span>{" "}
              <span className="font-mono">{backendMessage}</span>
            </p>
          ) : null}
        </div>
      </Panel>

      {kind === "review" ? <ReviewPanel segments={segments} score={score} /> : null}

      {kind === "research" ? <ResearchPanel segments={segments} /> : null}

      {kind === "invalid" ? (
        <Panel className="border-warning/35">
          <PanelHeader className="border-warning/25">
            <PanelTitle icon={CircleSlash}>Request could not be processed</PanelTitle>
          </PanelHeader>
          <div className="px-4 py-4 flex flex-col gap-3.5">
            <div>
              <SectionLabel>Backend response</SectionLabel>
              <div className="mt-2">
                <OutputRenderer segments={segments} />
              </div>
            </div>
            {onRetry ? (
              <div className="flex">
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw size={13} aria-hidden="true" />
                  Try Again
                </Button>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {kind === "code" || kind === "text" || kind === "greeting" ? (
        <Panel>
          <PanelHeader>
            <PanelTitle icon={kind === "greeting" ? MessageSquare : Terminal}>Output</PanelTitle>
          </PanelHeader>
          <div className="px-4 py-4">
            <OutputRenderer segments={segments} filenameBase="codepilot-output" />
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
