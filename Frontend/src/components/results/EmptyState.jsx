import { ExamplePrompts } from "../request/ExamplePrompts"
import { INTENT_CATEGORIES } from "../pipeline/pipelineStages"

export function EmptyState({ onSelectExample }) {
  return (
    <div className="flex flex-col gap-6 animate-fade-rise">
      <div className="rounded-card border border-border bg-surface px-5 py-6 sm:px-6 sm:py-7">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-balance">
          Build better code with a multi-agent workflow.
        </h2>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted text-pretty">
          Generate code, research technical topics, or review Python code. Every request goes through a single
          orchestrated pipeline endpoint, and the classified intent is decided server-side.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted mr-1">Intents</span>
          {INTENT_CATEGORIES.map((intent) => (
            <span
              key={intent}
              className="rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/80"
            >
              {intent}
            </span>
          ))}
        </div>
      </div>

      <ExamplePrompts onSelect={onSelectExample} />
    </div>
  )
}
