import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "./Button"
import { copyText } from "../../utils/format"

export function CopyButton({ value, label = "Copy", size = "sm", variant = "ghost", showLabel = false, className }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const handleCopy = useCallback(async () => {
    const ok = await copyText(value)
    if (!ok) return
    setCopied(true)
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setCopied(false), 1600)
  }, [value])

  const Icon = copied ? Check : Copy

  return (
    <Button
      variant={variant}
      size={showLabel ? size : size === "sm" ? "icon-sm" : "icon"}
      onClick={handleCopy}
      className={className}
      title={label}
      aria-label={copied ? "Copied to clipboard" : label}
    >
      <Icon size={13} className={copied ? "text-accent" : undefined} aria-hidden="true" />
      {showLabel ? <span>{copied ? "Copied" : label}</span> : null}
    </Button>
  )
}
