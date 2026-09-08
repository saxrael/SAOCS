import { Link } from "react-router"
import { ArrowLeft } from "lucide-react"

export function NotFoundPage() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-4">
      <div className="text-6xl font-bold font-(--font-mono) text-(--color-accent) mb-2">
        404
      </div>
      <h1 className="text-xl font-bold font-(--font-display) text-(--color-foreground) mb-2">
        Page Not Found
      </h1>
      <p className="text-xs md:text-sm text-(--color-foreground-2) max-w-sm mb-6 font-(--font-sans)">
        The requested resource does not exist or has been relocated within the system.
      </p>
      <Link
        to="/"
        className="min-h-11 px-5 rounded-(--radius-md) bg-(--color-accent) text-slate-950 font-medium text-xs tracking-wide uppercase transition-colors hover:bg-(--color-accent-hover) inline-flex items-center gap-2 focus:ring-2 focus:ring-(--color-ring) focus:outline-none"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Return to Dashboard
      </Link>
    </div>
  )
}
