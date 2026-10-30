import { BookOpen } from "lucide-react"
import { Panel, PanelHeader, PanelTitle } from "../ui/Panel"
import { OutputRenderer } from "./OutputRenderer"

export function ResearchPanel({ segments }) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle icon={BookOpen}>Research Result</PanelTitle>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Research Agent output</span>
      </PanelHeader>
      <div className="px-4 py-4">
        <OutputRenderer segments={segments} filenameBase="research-snippet" />
      </div>
    </Panel>
  )
}
