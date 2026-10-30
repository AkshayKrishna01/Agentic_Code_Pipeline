import { Plus, Settings } from "lucide-react"
import { Button } from "../ui/Button"
import { CopyButton } from "../ui/CopyButton"
import { SectionLabel } from "../ui/Panel"
import { StatusIndicator } from "../ui/StatusIndicator"
import { RequestHistory } from "./RequestHistory"

export function Sidebar({
  userId,
  apiBaseUrl,
  connection,
  history,
  activeId,
  requestCount,
  onNewRequest,
  onSelectHistory,
  onRemoveHistory,
  onClearHistory,
  onOpenSettings,
  maxItems,
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-3.5 py-3.5">
        <Button variant="primary" size="md" className="w-full justify-center" onClick={onNewRequest}>
          <Plus size={14} aria-hidden="true" />
          New Request
        </Button>
      </div>

      <div className="border-y border-border px-3.5 py-3.5">
        <SectionLabel>Session</SectionLabel>
        <dl className="mt-2 flex flex-col gap-2">
          <div>
            <dt className="text-[10.5px] text-muted">User ID</dt>
            <dd className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/85">{userId}</span>
              <CopyButton value={userId} label="Copy user ID" />
            </dd>
          </div>
          <div>
            <dt className="text-[10.5px] text-muted">API base URL</dt>
            <dd className="truncate font-mono text-[11px] text-foreground/85" title={apiBaseUrl}>
              {apiBaseUrl}
            </dd>
          </div>
          <div>
            <dt className="text-[10.5px] text-muted">Requests this session</dt>
            <dd className="font-mono text-[11px] tabular-nums text-foreground/85">{requestCount}</dd>
          </div>
        </dl>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3.5 py-3.5">
        <RequestHistory
          history={history}
          activeId={activeId}
          onSelect={onSelectHistory}
          onRemove={onRemoveHistory}
          onClear={onClearHistory}
          maxItems={maxItems}
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3.5 py-3">
        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
          <Settings size={13} aria-hidden="true" />
          Settings
        </Button>
        <StatusIndicator status={connection} />
      </div>
    </div>
  )
}
