import { Drawer } from "../ui/Drawer"

/**
 * Three-column workspace on desktop, two columns on large tablets, and a
 * single column with drawers below `xl`.
 */
export function AppShell({ header, sidebar, rightSidebar, children, leftOpen, rightOpen, onCloseLeft, onCloseRight }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {header}

      <div className="flex flex-1 min-h-0">
        <aside
          className="hidden xl:flex w-[272px] shrink-0 flex-col border-r border-border bg-surface/40"
          aria-label="Session and history"
        >
          <div className="sticky top-14 h-[calc(100vh-3.5rem)]">{sidebar}</div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-6 sm:py-7">{children}</div>
        </main>

        <aside
          className="hidden lg:block w-[300px] shrink-0 border-l border-border bg-surface/40"
          aria-label="Pipeline architecture and request metadata"
        >
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-thin">{rightSidebar}</div>
        </aside>
      </div>

      <Drawer open={leftOpen} onClose={onCloseLeft} side="left" title="Session" className="xl:hidden">
        {sidebar}
      </Drawer>

      <Drawer open={rightOpen} onClose={onCloseRight} side="right" title="Architecture" className="lg:hidden">
        {rightSidebar}
      </Drawer>
    </div>
  )
}
