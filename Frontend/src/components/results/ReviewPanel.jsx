import { ShieldCheck } from "lucide-react"
import { Panel, PanelHeader, PanelTitle, SectionLabel } from "../ui/Panel"
import { OutputRenderer } from "./OutputRenderer"

/**
 * Review presentation. A score is shown ONLY when the backend output actually
 * contains one — nothing is fabricated, including the pylint threshold verdict.
 */
export function ReviewPanel({ segments, score }) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle icon={ShieldCheck}>Code Review</PanelTitle>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Review Agent output</span>
      </PanelHeader>

      <div className="px-4 py-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-6 rounded-md border border-border bg-surface-raised/50 px-3.5 py-3">
          <div>
            <SectionLabel>Quality gate</SectionLabel>
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-foreground/90">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Result returned by backend
            </p>
          </div>

          {score !== null && score !== undefined ? (
            <div>
              <SectionLabel>Reported score</SectionLabel>
              <p className="mt-1 font-mono text-[13px] font-semibold text-accent tabular-nums">
                {score.toFixed(2)} <span className="text-muted font-normal">/ 10</span>
              </p>
            </div>
          ) : (
            <div>
              <SectionLabel>Reported score</SectionLabel>
              <p className="mt-1 text-[12px] text-muted">Not included in the API response</p>
            </div>
          )}
        </div>

        <div>
          <SectionLabel>Review output</SectionLabel>
          <div className="mt-2">
            <OutputRenderer segments={segments} filenameBase="reviewed-code" />
          </div>
        </div>
      </div>
    </Panel>
  )
}
