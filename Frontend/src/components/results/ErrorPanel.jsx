import { AlertTriangle, RefreshCw, ServerCrash, Unplug } from "lucide-react"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { CopyButton } from "../ui/CopyButton"
import { Panel, PanelHeader, PanelTitle, SectionLabel } from "../ui/Panel"
import { ERROR_KINDS } from "../../services/api"
import { formatTimestamp } from "../../utils/format"

const ICONS = {
  [ERROR_KINDS.network]: Unplug,
  [ERROR_KINDS.server]: ServerCrash,
  [ERROR_KINDS.validation]: AlertTriangle,
  [ERROR_KINDS.request]: AlertTriangle,
  [ERROR_KINDS.aborted]: AlertTriangle,
  [ERROR_KINDS.unknown]: AlertTriangle,
}

const RETRY_LABELS = {
  [ERROR_KINDS.network]: "Retry",
  [ERROR_KINDS.server]: "Retry Request",
  [ERROR_KINDS.request]: "Try Again",
  [ERROR_KINDS.validation]: "Try Again",
  [ERROR_KINDS.aborted]: "Run Again",
  [ERROR_KINDS.unknown]: "Retry Request",
}

export function ErrorPanel({ error, apiBaseUrl, onRetry }) {
  if (!error) return null

  const Icon = ICONS[error.kind] || AlertTriangle
  const retryLabel = RETRY_LABELS[error.kind] || "Retry"

  return (
    <Panel className="border-danger/35">
      <PanelHeader className="border-danger/25 bg-danger-soft/40">
        <PanelTitle icon={Icon}>{error.title}</PanelTitle>
        <div className="flex items-center gap-2">
          {error.status ? <Badge tone="danger">HTTP {error.status}</Badge> : <Badge tone="danger">No response</Badge>}
        </div>
      </PanelHeader>

      <div className="px-4 py-4 flex flex-col gap-4">
        <p className="text-[13px] leading-relaxed text-foreground/90 text-pretty">{error.message}</p>

        {error.kind === ERROR_KINDS.network ? (
          <div className="rounded-md border border-border bg-surface-raised/60 px-3.5 py-3">
            <SectionLabel>Expected backend</SectionLabel>
            <p className="mt-1 font-mono text-[11.5px] break-all text-foreground/85">{apiBaseUrl}/pipeline/code</p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted text-pretty">
              Start the FastAPI server, confirm it is listening on that host and port, and make sure CORS allows this
              origin.
            </p>
          </div>
        ) : null}

        {error.details?.length ? (
          <div className="rounded-md border border-border bg-surface-raised/60 px-3.5 py-3">
            <SectionLabel>Details</SectionLabel>
            <ul className="mt-1.5 flex flex-col gap-1">
              {error.details.map((detail, index) => (
                <li key={index} className="font-mono text-[11.5px] leading-relaxed text-foreground/85 break-words">
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error.requestId || error.timestamp ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {error.requestId ? (
              <div className="min-w-0">
                <SectionLabel>Request ID</SectionLabel>
                <div className="mt-1 flex items-center gap-1">
                  <span className="font-mono text-[11.5px] break-all text-foreground/85">{error.requestId}</span>
                  <CopyButton value={error.requestId} label="Copy request ID" />
                </div>
              </div>
            ) : null}
            {error.timestamp ? (
              <div className="min-w-0">
                <SectionLabel>Timestamp</SectionLabel>
                <p className="mt-1 text-[12.5px] text-foreground/85">{formatTimestamp(error.timestamp)}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {onRetry ? (
          <div className="flex">
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw size={13} aria-hidden="true" />
              {retryLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}
