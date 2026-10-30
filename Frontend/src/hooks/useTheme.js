import { useCallback, useEffect, useState } from "react"
import { storage, STORAGE_KEYS } from "../utils/config"

/** Dark-first theme with localStorage persistence. */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = storage.get(STORAGE_KEYS.theme)
    return stored === "light" || stored === "dark" ? stored : "dark"
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    storage.set(STORAGE_KEYS.theme, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"))
  }, [])

  return { theme, setTheme, toggleTheme }
}
