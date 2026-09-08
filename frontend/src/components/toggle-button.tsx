export function ToggleButton({
  isOn,
  isLoading,
  onClick,
  ariaLabel,
}: {
  isOn: boolean
  isLoading: boolean
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-label={ariaLabel}
      className={`min-w-28 min-h-11 px-4 py-2.5 rounded-(--radius-md) font-medium text-xs tracking-wider uppercase transition-colors flex items-center justify-center cursor-pointer focus:ring-2 focus:ring-(--color-ring) focus:outline-none ${
        isOn
          ? "bg-(--color-surface-2) text-(--color-destructive) border border-(--color-border) hover:bg-slate-700"
          : "bg-(--color-accent) text-slate-950 hover:bg-(--color-accent-hover)"
      } disabled:opacity-50`}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isOn ? (
        "Turn Off"
      ) : (
        "Turn On"
      )}
    </button>
  )
}
