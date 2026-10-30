import { Moon, PanelLeft, PanelRight, Settings, Sun } from "lucide-react"
import { Button } from "../ui/Button"
import { StatusIndicator } from "../ui/StatusIndicator"

function Logo() {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/35 bg-accent-soft"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2.1">
        <path d="M9 7 4.5 12 9 17" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m15 7 4.5 5-4.5 5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    </span>
  )
}

export function Header({ connection, theme, onToggleTheme, onOpenSettings, onOpenLeft, onOpenRight }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-4">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" className="xl:hidden" onClick={onOpenLeft} aria-label="Open session panel">
          <PanelLeft size={16} aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-2.5 min-w-0">
          <Logo />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold leading-tight tracking-tight">CodePilot AI</p>
            <p className="hidden sm:block text-[11px] leading-tight text-muted truncate">
              Multi-Agent Code Engineering
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <StatusIndicator status={connection} className="hidden sm:inline-flex" />
        <StatusIndicator status={connection} compact className="sm:hidden" />

        <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Open settings">
          <Settings size={16} aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenRight}
          aria-label="Open architecture panel"
        >
          <PanelRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </header>
  )
}
