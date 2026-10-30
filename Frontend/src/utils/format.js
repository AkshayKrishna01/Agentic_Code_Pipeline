/** Format an ISO timestamp as "Aug 22, 2026 · 10:15 AM". Falls back to raw input. */
export function formatTimestamp(value) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const datePart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })

  return `${datePart} · ${timePart}`
}

/** Compact relative time, e.g. "2 min ago". */
export function formatRelativeTime(value) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)

  if (seconds < 45) return "just now"
  if (seconds < 90) return "1 min ago"

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`

  const days = Math.round(hours / 24)
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** Shorten a UUID for dense UI surfaces. */
export function shortenId(id, size = 8) {
  if (!id) return "—"
  const value = String(id)
  return value.length <= size ? value : `${value.slice(0, size)}…`
}

/** Truncate free text for list rows. */
export function truncate(text, max = 96) {
  const value = String(text || "").replace(/\s+/g, " ").trim()
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

export function formatDuration(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—"
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`
}

/** Copy to clipboard with a legacy fallback for non-secure contexts. */
export async function copyText(text) {
  const value = String(text ?? "")

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const area = document.createElement("textarea")
    area.value = value
    area.setAttribute("readonly", "")
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/** Trigger a client-side file download. */
export function downloadTextFile(filename, contents) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
