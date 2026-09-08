export function LoadingSpinner({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  }[size]

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block border-(--color-accent) border-t-transparent rounded-full animate-spin ${sizeClasses} ${className}`}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
