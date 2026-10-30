import { ArrowUpRight } from "lucide-react"
import { Badge } from "../ui/Badge"
import { SectionLabel } from "../ui/Panel"
import { EXAMPLE_PROMPTS, INTENT_TONES } from "./promptData"
import { cn } from "../../utils/cn"

export function ExamplePrompts({ onSelect, className, limit }) {
  const prompts = typeof limit === "number" ? EXAMPLE_PROMPTS.slice(0, limit) : EXAMPLE_PROMPTS

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <SectionLabel>Example prompts</SectionLabel>

      <ul className="grid gap-2 sm:grid-cols-2">
        {prompts.map((example) => (
          <li key={example.id}>
            <button
              type="button"
              onClick={() => onSelect?.(example.prompt)}
              className={cn(
                "group w-full h-full text-left rounded-card border border-border bg-surface px-3.5 py-3",
                "transition-colors hover:border-border-strong hover:bg-surface-raised",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <Badge tone={INTENT_TONES[example.intent] || "neutral"}>{example.intent}</Badge>
                <ArrowUpRight
                  size={13}
                  className="text-muted opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-2 block text-[13px] font-medium tracking-tight">{example.title}</span>
              <span className="mt-1 block font-mono text-[11px] leading-relaxed text-muted line-clamp-2">
                {example.prompt.split("\n")[0]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
