import { CopyButton } from "../ui/CopyButton"
import { SectionLabel } from "../ui/Panel"
import { cn } from "../../utils/cn"
import { formatDuration, formatTimestamp } from "../../utils/format"

function Field({ label, value, mono = false, tone, copyValue }) {
  return (
    <div className="min-w-0">
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1 flex items-center gap-1">
        <span
          className={cn(
            "text-[12.5px] leading-snug min-w-0 break-all",
            mono && "font-mono text-[11.5px]",
            tone === "success" && "text-accent font-semibold",
            tone === "danger" && "text-danger font-semibold",
            !tone && "text-foreground/90",
          )}
        >
          {value}
        </span>
        {copyValue ? <CopyButton value={copyValue} label={`Copy ${label.toLowerCase()}`} /> : null}
      </div>
    </div>
  )
}

export function RequestMetadata({ status, httpStatus, requestId, timestamp, durationMs, className }) {
  const isError = status && status.toLowerCase() !== "success"

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      <Field label="Status" value={(status || "—").toUpperCase()} tone={isError ? "danger" : "success"} />
      <Field label="HTTP Status" value={httpStatus ?? "—"} mono />
      <Field label="Request ID" value={requestId || "—"} mono copyValue={requestId || undefined} />
      <div className="min-w-0">
        <SectionLabel>Timestamp</SectionLabel>
        <div className="mt-1 text-[12.5px] leading-snug text-foreground/90">{formatTimestamp(timestamp)}</div>
        {typeof durationMs === "number" ? (
          <div className="mt-0.5 font-mono text-[11px] text-muted">round trip {formatDuration(durationMs)}</div>
        ) : null}
      </div>
    </div>
  )
}
