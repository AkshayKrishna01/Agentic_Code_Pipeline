import { useEffect, useState } from "react"
import { Moon, RefreshCw, RotateCcw, Sun } from "lucide-react"
import { Button } from "../ui/Button"
import { CopyButton } from "../ui/CopyButton"
import { Modal } from "../ui/Modal"
import { SectionLabel } from "../ui/Panel"
import { cn } from "../../utils/cn"
import { DEFAULT_API_BASE_URL } from "../../utils/config"

export function SettingsModal({
  open,
  onClose,
  theme,
  onThemeChange,
  apiBaseUrl,
  onApiBaseUrlChange,
  userId,
  onRegenerateUserId,
}) {
  const [draftUrl, setDraftUrl] = useState(apiBaseUrl)

  useEffect(() => {
    if (open) setDraftUrl(apiBaseUrl)
  }, [open, apiBaseUrl])

  const handleSave = () => {
    onApiBaseUrlChange?.(draftUrl)
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Client-side preferences only. No credentials are stored by this app."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <section>
          <SectionLabel>Appearance</SectionLabel>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { value: "dark", label: "Dark mode", icon: Moon },
              { value: "light", label: "Light mode", icon: Sun },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onThemeChange?.(option.value)}
                aria-pressed={theme === option.value}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2.5 text-[12.5px] font-medium transition-colors",
                  theme === option.value
                    ? "border-accent/50 bg-accent-soft text-foreground"
                    : "border-border bg-surface-raised text-muted hover:border-border-strong hover:text-foreground",
                )}
              >
                <option.icon size={14} aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <label htmlFor="api-base-url">
            <SectionLabel>API base URL</SectionLabel>
          </label>
          <input
            id="api-base-url"
            type="url"
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            spellCheck="false"
            autoComplete="off"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-muted/70 focus:border-accent/50 focus:outline-none"
            placeholder={DEFAULT_API_BASE_URL}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] leading-relaxed text-muted">
              Requests are sent to <span className="font-mono">{draftUrl || DEFAULT_API_BASE_URL}/pipeline/code</span>
            </p>
            <Button variant="ghost" size="sm" onClick={() => setDraftUrl(DEFAULT_API_BASE_URL)}>
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </Button>
          </div>
        </section>

        <section>
          <SectionLabel>User</SectionLabel>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-foreground/85">{userId}</span>
            <CopyButton value={userId} label="Copy user ID" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] leading-relaxed text-muted">
              Locally generated session identifier sent as <span className="font-mono">user_id</span>.
            </p>
            <Button variant="ghost" size="sm" onClick={onRegenerateUserId}>
              <RefreshCw size={12} aria-hidden="true" />
              Regenerate
            </Button>
          </div>
        </section>

        <section className="border-t border-border pt-4">
          <SectionLabel>About</SectionLabel>
          <p className="mt-2 text-[13px] font-medium">CodePilot AI</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted text-pretty">
            Frontend client for a Multi-Agent Code Pipeline backend. All history is stored in this browser; the client
            calls a single pipeline endpoint and stores no credentials.
          </p>
        </section>
      </div>
    </Modal>
  )
}
