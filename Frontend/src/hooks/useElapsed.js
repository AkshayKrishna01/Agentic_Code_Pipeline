import { useEffect, useState } from "react"

/** Ticking elapsed-milliseconds counter, used by the loading state. */
export function useElapsed(active) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) {
      setElapsed(0)
      return undefined
    }

    const start = performance.now()
    setElapsed(0)

    const id = window.setInterval(() => {
      setElapsed(performance.now() - start)
    }, 100)

    return () => window.clearInterval(id)
  }, [active])

  return elapsed
}
