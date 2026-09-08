import { AlertCircle } from "lucide-react"

export function ErrorInline({ message }: { message: string }) {
  if (!message) return null

  return (
    <div
      role="alert"
      className="p-3 bg-red-950/60 border border-(--color-destructive) rounded-(--radius-md) text-red-200 text-xs flex items-start gap-2"
    >
      <AlertCircle className="w-4 h-4 text-(--color-destructive) shrink-0 mt-0.5" aria-hidden="true" />
      <span className="font-medium leading-relaxed">{message}</span>
    </div>
  )
}
