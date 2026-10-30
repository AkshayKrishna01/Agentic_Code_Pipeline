import { useCallback, useEffect, useState } from "react"
import { createUuid, storage, STORAGE_KEYS } from "../utils/config"

const MAX_ITEMS = 20

function readHistory() {
  const raw = storage.get(STORAGE_KEYS.history)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item === "object").slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

/**
 * Browser-local request history. The backend has no history endpoint, so this
 * is intentionally client-only and clearly labelled as such in the UI.
 */
export function useRequestHistory() {
  const [history, setHistory] = useState(readHistory)

  useEffect(() => {
    storage.set(STORAGE_KEYS.history, JSON.stringify(history))
  }, [history])

  const addEntry = useCallback((entry) => {
    const record = {
      localId: createUuid(),
      createdAt: new Date().toISOString(),
      ...entry,
    }
    setHistory((current) => [record, ...current].slice(0, MAX_ITEMS))
    return record
  }, [])

  const removeEntry = useCallback((localId) => {
    setHistory((current) => current.filter((item) => item.localId !== localId))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  return { history, addEntry, removeEntry, clearHistory, maxItems: MAX_ITEMS }
}
