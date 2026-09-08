import type { ReactNode } from "react"

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-(--font-display) tracking-tight text-(--color-foreground)">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-(--color-foreground-2) mt-1 font-(--font-sans)">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  )
}
