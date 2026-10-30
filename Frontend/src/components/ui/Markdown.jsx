import { Fragment, useMemo } from "react"
import { cn } from "../../utils/cn"

/**
 * Minimal, safe Markdown renderer. It never injects HTML — every node is a
 * real React element, so backend output cannot execute markup.
 * Fenced code blocks are handled upstream by parseSegments().
 */

const INLINE_RE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g

function renderInline(text, keyPrefix) {
  const parts = String(text ?? "").split(INLINE_RE).filter((part) => part !== "" && part !== undefined)

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={key}
          className="font-mono text-[0.86em] px-1 py-0.5 rounded bg-surface-raised border border-border text-accent"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }

    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      if (part.length > 2) {
        return (
          <em key={key} className="italic">
            {part.slice(1, -1)}
          </em>
        )
      }
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part)
    if (link) {
      return (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent underline underline-offset-2 hover:opacity-80"
        >
          {link[1]}
        </a>
      )
    }

    return <Fragment key={key}>{part}</Fragment>
  })
}

function toBlocks(source) {
  const lines = String(source ?? "").replace(/\r\n/g, "\n").split("\n")
  const blocks = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] })
      index += 1
      continue
    }

    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      blocks.push({ type: "rule" })
      index += 1
      continue
    }

    if (/^>\s?/.test(trimmed)) {
      const quote = []
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""))
        index += 1
      }
      blocks.push({ type: "quote", text: quote.join(" ") })
      continue
    }

    if (/^([-*+])\s+/.test(trimmed)) {
      const items = []
      while (index < lines.length && /^\s*([-*+])\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*([-*+])\s+/, ""))
        index += 1
      }
      blocks.push({ type: "ul", items })
      continue
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items = []
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""))
        index += 1
      }
      blocks.push({ type: "ol", items })
      continue
    }

    const paragraph = []
    while (index < lines.length && lines[index].trim() && !/^(#{1,6}\s|>\s?|[-*+]\s|\d+[.)]\s)/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push({ type: "p", text: paragraph.join(" ") })
  }

  return blocks
}

const HEADING_CLASSES = {
  1: "text-lg font-semibold tracking-tight mt-5 first:mt-0",
  2: "text-base font-semibold tracking-tight mt-5 first:mt-0",
  3: "text-sm font-semibold tracking-tight mt-4 first:mt-0",
  4: "text-sm font-semibold text-muted mt-4 first:mt-0",
  5: "text-xs font-semibold uppercase tracking-[0.1em] text-muted mt-4 first:mt-0",
  6: "text-xs font-semibold uppercase tracking-[0.1em] text-muted mt-4 first:mt-0",
}

export function Markdown({ children, className }) {
  const blocks = useMemo(() => toBlocks(children), [children])

  return (
    <div className={cn("text-sm leading-relaxed text-foreground/90", className)}>
      {blocks.map((block, index) => {
        const key = `block-${index}`

        if (block.type === "heading") {
          const Tag = `h${Math.min(block.level + 1, 6)}`
          return (
            <Tag key={key} className={HEADING_CLASSES[block.level]}>
              {renderInline(block.text, key)}
            </Tag>
          )
        }

        if (block.type === "rule") {
          return <hr key={key} className="my-5 border-border" />
        }

        if (block.type === "quote") {
          return (
            <blockquote key={key} className="my-3 pl-3 border-l-2 border-accent/50 text-muted italic">
              {renderInline(block.text, key)}
            </blockquote>
          )
        }

        if (block.type === "ul" || block.type === "ol") {
          const Tag = block.type === "ul" ? "ul" : "ol"
          return (
            <Tag
              key={key}
              className={cn(
                "my-3 pl-5 flex flex-col gap-1.5",
                block.type === "ul" ? "list-disc" : "list-decimal",
                "marker:text-muted",
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="pl-0.5">
                  {renderInline(item, `${key}-${itemIndex}`)}
                </li>
              ))}
            </Tag>
          )
        }

        return (
          <p key={key} className="my-3 first:mt-0 last:mb-0 text-pretty">
            {renderInline(block.text, key)}
          </p>
        )
      })}
    </div>
  )
}
