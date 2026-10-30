const STORAGE_KEYS = {
  apiBaseUrl: "codepilot.apiBaseUrl",
  userId: "codepilot.userId",
  history: "codepilot.history",
  theme: "codepilot.theme",
}

export const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1/agentic"
export const API_AUTH_TOKEN = String(import.meta.env.VITE_API_AUTH_TOKEN || "").trim()

export const PIPELINE_PATH = "/pipeline/code"

export { STORAGE_KEYS }

function safeGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — run in-memory only */
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

export const storage = {
  get: safeGet,
  set: safeSet,
  remove: safeRemove,
}

/** Normalize a base URL by trimming whitespace and any trailing slashes. */
export function normalizeBaseUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "")
}

export function getApiBaseUrl() {
  const stored = normalizeBaseUrl(safeGet(STORAGE_KEYS.apiBaseUrl))
  return stored || normalizeBaseUrl(DEFAULT_API_BASE_URL)
}

export function setApiBaseUrl(url) {
  const normalized = normalizeBaseUrl(url)
  if (normalized) safeSet(STORAGE_KEYS.apiBaseUrl, normalized)
  else safeRemove(STORAGE_KEYS.apiBaseUrl)
  return normalized || normalizeBaseUrl(DEFAULT_API_BASE_URL)
}

/** Create a RFC4122-ish v4 id, preferring the platform implementation. */
export function createUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0
    const value = char === "x" ? rand : (rand & 0x3) | 0x8
    return value.toString(16)
  })
}

export function getUserId() {
  const existing = safeGet(STORAGE_KEYS.userId)
  if (existing) return existing

  const generated = `user-${createUuid()}`
  safeSet(STORAGE_KEYS.userId, generated)
  return generated
}

export function regenerateUserId() {
  const next = `user-${createUuid()}`
  safeSet(STORAGE_KEYS.userId, next)
  return next
}
