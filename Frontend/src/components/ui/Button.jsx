import { cn } from "../../utils/cn"

const VARIANTS = {
  primary:
    "bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-45 shadow-sm shadow-black/20 font-semibold",
  secondary: "bg-surface-raised text-foreground border border-border hover:border-border-strong disabled:opacity-45",
  ghost: "text-muted hover:text-foreground hover:bg-surface-raised disabled:opacity-45",
  outline: "border border-border text-foreground hover:border-border-strong hover:bg-surface-raised disabled:opacity-45",
  danger: "bg-danger-soft text-danger border border-danger/30 hover:border-danger/60 disabled:opacity-45",
}

const SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9.5 px-4 text-sm gap-2 rounded-md",
  lg: "h-11 px-5 text-sm gap-2 rounded-lg",
  icon: "h-8.5 w-8.5 rounded-md justify-center",
  "icon-sm": "h-7 w-7 rounded justify-center",
}

export function Button({ variant = "secondary", size = "md", className, type = "button", children, ...props }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center whitespace-nowrap transition-colors duration-150 select-none",
        "disabled:cursor-not-allowed",
        VARIANTS[variant] || VARIANTS.secondary,
        SIZES[size] || SIZES.md,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
