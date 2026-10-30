import { HardDrive, Trash2 } from "lucide-react"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { SectionLabel } from "../ui/Panel"
import { INTENT_TONES } from "../request/promptData"
import { cn } from "../../utils/cn"
import { formatRelativeTime, shortenId, truncate } from "../../utils/format"
import { kindLabel } from "../../utils/output"

export function RequestHistory({ history, activeId, onSelect, onRemove, onClear, maxItems }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>Recent requests</SectionLabel>
        {history.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-[10.5px] font-medium text-muted transition-colors hover:text-danger"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {history.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-[11.5px] leading-relaxed text-muted text-pretty">
          No requests yet. History is stored in this browser only — the backend has no history endpoint.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {history.map((item) => {
            const isActive = item.localId === activeId
            const isError = item.ok !== true

            return (
              <li key={item.localId} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect?.(item)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "border-accent/45 bg-accent-soft"
                      : "border-border bg-surface hover:border-border-strong hover:bg-surface-raised",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Badge tone={isError ? "danger" : INTENT_TONES[item.kind] || "neutral"}>
                      {isError ? "Failed" : kindLabel(item.kind)}
                    </Badge>
                    <span className="ml-auto pr-6 text-[10.5px] text-muted">{formatRelativeTime(item.createdAt)}</span>
                  </span>

                  <span className="mt-1.5 block text-[12.5px] leading-snug font-medium text-foreground/90 line-clamp-2">
                    {truncate(item.query, 90)}
                  </span>

                  {item.requestId ? (
                    <span className="mt-1 block font-mono text-[10px] text-muted">{shortenId(item.requestId, 8)}</span>
                  ) : null}
                </button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemove?.(item.localId)
                  }}
                  className="absolute right-1.5 top-1.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={`Delete request: ${truncate(item.query, 40)}`}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-[10.5px] text-muted">
        <HardDrive size={11} aria-hidden="true" />
        Browser-local · max {maxItems}
      </p>
    </div>
  )
}
