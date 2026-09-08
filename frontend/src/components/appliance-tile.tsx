import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Zap, Power } from "lucide-react"
import { commandAppliance } from "@/api/appliances"
import { ToggleButton } from "@/components/toggle-button"
import { ErrorInline } from "@/components/error-inline"
import type { Appliance } from "@/types/appliance"

export function ApplianceTile({ appliance }: { appliance: Appliance }) {
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const currentState = appliance.state?.current_state ?? "OFF"
  const isOn = currentState === "ON"

  const mutation = useMutation({
    mutationFn: (targetState: "ON" | "OFF") =>
      commandAppliance(appliance.id, { state: targetState }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ["appliances"] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Command failed"
      setError(`Failed to turn ${isOn ? "off" : "on"} ${appliance.name}: ${msg}`)
    },
  })

  const handleToggle = () => {
    setError(null)
    const target = isOn ? "OFF" : "ON"
    mutation.mutate(target)
  }

  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) p-6 shadow-(--shadow-card) flex flex-col justify-between transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold font-(--font-display) text-(--color-foreground)">
            {appliance.name}
          </h3>
          <div className="text-xs text-(--color-foreground-2) mt-1 font-(--font-mono)">
            Channel {appliance.relay_channel} • {appliance.assumed_wattage_watts}W
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-(--radius-md) bg-(--color-surface-2) border border-(--color-border)">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isOn ? "bg-(--color-accent) animate-pulse" : "bg-slate-500"
            }`}
          />
          {isOn ? (
            <Zap className="w-3.5 h-3.5 text-(--color-accent)" aria-hidden="true" />
          ) : (
            <Power className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          )}
          <span
            className={`text-xs font-bold font-(--font-mono) uppercase ${
              isOn ? "text-(--color-accent)" : "text-slate-400"
            }`}
          >
            {currentState}
          </span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-(--color-border) flex items-center justify-between gap-4">
        <div className="text-xs text-(--color-foreground-2)">
          {appliance.state ? (
            <div>
              <span>Source: </span>
              <span className="text-(--color-foreground) font-medium uppercase font-(--font-mono)">
                {appliance.state.last_changed_source}
              </span>
              {appliance.state.last_changed_at && (
                <div className="text-[11px] text-(--color-foreground-2)/80 font-(--font-mono)">
                  {new Date(appliance.state.last_changed_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              )}
            </div>
          ) : (
            <span>No state recorded</span>
          )}
        </div>
        <ToggleButton
          isOn={isOn}
          isLoading={mutation.isPending}
          onClick={handleToggle}
          ariaLabel={`Toggle ${appliance.name}`}
        />
      </div>

      {error && (
        <div className="mt-4">
          <ErrorInline message={error} />
        </div>
      )}
    </div>
  )
}
