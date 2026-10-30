import { useCallback, useEffect, useRef, useState } from "react"
import { AppShell } from "../components/layout/AppShell"
import { Header } from "../components/layout/Header"
import { RightSidebar } from "../components/layout/RightSidebar"
import { SettingsModal } from "../components/layout/SettingsModal"
import { Sidebar } from "../components/layout/Sidebar"
import { RequestComposer } from "../components/request/RequestComposer"
import { EmptyState } from "../components/results/EmptyState"
import { ErrorPanel } from "../components/results/ErrorPanel"
import { LoadingState } from "../components/results/LoadingState"
import { ResultPanel } from "../components/results/ResultPanel"
import { CONNECTION } from "../components/ui/StatusIndicator"
import { useRequestHistory } from "../hooks/useRequestHistory"
import { useTheme } from "../hooks/useTheme"
import { ERROR_KINDS, sendPipelineRequest } from "../services/api"
import { getApiBaseUrl, getUserId, regenerateUserId, setApiBaseUrl } from "../utils/config"
import { classifyOutput } from "../utils/output"

export function Workspace() {
  const { theme, setTheme, toggleTheme } = useTheme()
  const { history, addEntry, removeEntry, clearHistory, maxItems } = useRequestHistory()

  const [apiBaseUrl, setApiBaseUrlState] = useState(() => getApiBaseUrl())
  const [userId, setUserId] = useState(() => getUserId())

  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [connection, setConnection] = useState(CONNECTION.unknown)
  const [requestCount, setRequestCount] = useState(0)
  const [activeId, setActiveId] = useState(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const runRequest = useCallback(
    async (rawQuery) => {
      const trimmed = String(rawQuery || "").trim()
      if (!trimmed || loading) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setSubmittedQuery(trimmed)
      setLoading(true)
      setError(null)
      setResult(null)
      setConnection(CONNECTION.checking)

      const outcome = await sendPipelineRequest(trimmed, userId, {
        baseUrl: apiBaseUrl,
        signal: controller.signal,
      })

      if (controller.signal.aborted && outcome.error?.kind === ERROR_KINDS.aborted) {
        setLoading(false)
        setConnection(CONNECTION.unknown)
        setError(outcome.error)
        return
      }

      setLoading(false)
      setRequestCount((count) => count + 1)

      if (outcome.ok) {
        const nextResult = {
          query: trimmed,
          response: outcome.data,
          httpStatus: outcome.status,
          durationMs: outcome.durationMs,
        }
        setResult(nextResult)
        setConnection(CONNECTION.connected)

        const record = addEntry({
          query: trimmed,
          kind: classifyOutput(outcome.data?.data?.output ?? "", trimmed),
          ok: true,
          httpStatus: outcome.status,
          durationMs: outcome.durationMs,
          requestId: outcome.data?.request_id ?? null,
          response: outcome.data,
        })
        setActiveId(record.localId)
        return
      }

      setError(outcome.error)
      setConnection(outcome.error?.kind === ERROR_KINDS.network ? CONNECTION.offline : CONNECTION.connected)

      const record = addEntry({
        query: trimmed,
        kind: "failed",
        ok: false,
        httpStatus: outcome.status,
        durationMs: outcome.durationMs,
        requestId: outcome.error?.requestId ?? null,
        error: outcome.error,
      })
      setActiveId(record.localId)
    },
    [addEntry, apiBaseUrl, loading, userId],
  )

  const handleSubmit = useCallback(() => {
    runRequest(query)
  }, [query, runRequest])

  const handleRetry = useCallback(() => {
    runRequest(submittedQuery || query)
  }, [query, runRequest, submittedQuery])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleNewRequest = useCallback(() => {
    abortRef.current?.abort()
    setQuery("")
    setSubmittedQuery("")
    setResult(null)
    setError(null)
    setActiveId(null)
    setLeftOpen(false)
  }, [])

  const handleSelectHistory = useCallback((entry) => {
    setActiveId(entry.localId)
    setQuery(entry.query)
    setSubmittedQuery(entry.query)
    setLeftOpen(false)

    if (entry.ok && entry.response) {
      setError(null)
      setResult({
        query: entry.query,
        response: entry.response,
        httpStatus: entry.httpStatus,
        durationMs: entry.durationMs,
      })
      return
    }

    setResult(null)
    setError(entry.error ?? null)
  }, [])

  const handleRemoveHistory = useCallback(
    (localId) => {
      removeEntry(localId)
      if (localId === activeId) setActiveId(null)
    },
    [activeId, removeEntry],
  )

  const handleClearHistory = useCallback(() => {
    clearHistory()
    setActiveId(null)
  }, [clearHistory])

  const handleApiBaseUrlChange = useCallback((next) => {
    setApiBaseUrlState(setApiBaseUrl(next))
    setConnection(CONNECTION.unknown)
  }, [])

  const handleRegenerateUserId = useCallback(() => {
    setUserId(regenerateUserId())
  }, [])

  const showEmpty = !loading && !result && !error

  return (
    <>
      <AppShell
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onCloseLeft={() => setLeftOpen(false)}
        onCloseRight={() => setRightOpen(false)}
        header={
          <Header
            connection={loading ? CONNECTION.checking : connection}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenLeft={() => setLeftOpen(true)}
            onOpenRight={() => setRightOpen(true)}
          />
        }
        sidebar={
          <Sidebar
            userId={userId}
            apiBaseUrl={apiBaseUrl}
            connection={connection}
            history={history}
            activeId={activeId}
            requestCount={requestCount}
            maxItems={maxItems}
            onNewRequest={handleNewRequest}
            onSelectHistory={handleSelectHistory}
            onRemoveHistory={handleRemoveHistory}
            onClearHistory={handleClearHistory}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        }
        rightSidebar={
          <RightSidebar
            loading={loading}
            connection={connection}
            apiBaseUrl={apiBaseUrl}
            result={result}
            error={error}
          />
        }
      >
        <div className="flex flex-col gap-5">
          <RequestComposer
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            onClear={() => setQuery("")}
            loading={loading}
          />

          {loading ? <LoadingState query={submittedQuery} onCancel={handleCancel} /> : null}

          {!loading && error ? (
            <ErrorPanel error={error} apiBaseUrl={apiBaseUrl} onRetry={handleRetry} />
          ) : null}

          {!loading && result ? <ResultPanel result={result} onRetry={handleRetry} /> : null}

          {showEmpty ? <EmptyState onSelectExample={setQuery} /> : null}
        </div>
      </AppShell>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        apiBaseUrl={apiBaseUrl}
        onApiBaseUrlChange={handleApiBaseUrlChange}
        userId={userId}
        onRegenerateUserId={handleRegenerateUserId}
      />
    </>
  )
}
