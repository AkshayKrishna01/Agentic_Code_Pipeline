/**
 * Minimal class name joiner. Accepts strings, arrays and conditional objects.
 */
export function cn(...inputs) {
  const out = []

  for (const input of inputs) {
    if (!input) continue

    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input))
      continue
    }

    if (Array.isArray(input)) {
      const nested = cn(...input)
      if (nested) out.push(nested)
      continue
    }

    if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) out.push(key)
      }
    }
  }

  return out.join(" ")
}
