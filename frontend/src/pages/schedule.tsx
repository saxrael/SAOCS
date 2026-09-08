import { useState, type FormEvent } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { CalendarPlus, Trash2, CheckCircle2, Clock } from "lucide-react"
import { listAppliances } from "@/api/appliances"
import { listSchedules, createSchedule, deleteSchedule } from "@/api/schedules"
import { PageHeader } from "@/components/page-header"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ErrorInline } from "@/components/error-inline"

export function SchedulePage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [applianceId, setApplianceId] = useState<number | "">("")
  const [action, setAction] = useState<"ON" | "OFF">("ON")
  const [scheduledTime, setScheduledTime] = useState("")
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: schedules, isLoading: isSchedulesLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: listSchedules,
  })

  const { data: appliances } = useQuery({
    queryKey: ["appliances"],
    queryFn: listAppliances,
  })

  const createMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] })
      setIsFormOpen(false)
      setScheduledTime("")
      setApplianceId("")
      setError(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to create schedule")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to delete schedule")
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!applianceId || !scheduledTime) {
      setError("Please select an appliance and scheduled time.")
      return
    }
    const isoTime = new Date(scheduledTime).toISOString()
    createMutation.mutate({
      appliance_id: Number(applianceId),
      action,
      scheduled_time: isoTime,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Appliance Schedules"
          subtitle="Automated timed switching for connected devices."
        />
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="min-h-11 px-4 rounded-(--radius-md) bg-(--color-accent) text-slate-950 font-medium text-sm hover:bg-(--color-accent-hover) transition-colors cursor-pointer flex items-center justify-center gap-2 self-start sm:self-auto focus:ring-2 focus:ring-(--color-ring) focus:outline-none"
        >
          <CalendarPlus className="w-4 h-4" aria-hidden="true" />
          <span>{isFormOpen ? "Cancel" : "New Schedule"}</span>
        </button>
      </div>

      {error && !isFormOpen && <ErrorInline message={error} />}

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) p-6 space-y-4 shadow-(--shadow-card)"
        >
          <h3 className="text-sm font-semibold font-(--font-display) text-(--color-foreground)">
            Create Scheduled Action
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="schedule-appliance"
                className="block text-xs font-medium text-(--color-foreground-2) mb-1.5 font-(--font-sans)"
              >
                Appliance
              </label>
              <select
                id="schedule-appliance"
                required
                value={applianceId}
                onChange={(e) => setApplianceId(e.target.value ? Number(e.target.value) : "")}
                className="w-full min-h-11 px-3 bg-(--color-surface-2)/60 border border-(--color-border) rounded-(--radius-md) text-(--color-foreground) text-sm focus:ring-2 focus:ring-(--color-ring) focus:outline-none transition-colors"
              >
                <option value="">Select an appliance</option>
                {appliances?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Ch {a.relay_channel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="schedule-action"
                className="block text-xs font-medium text-(--color-foreground-2) mb-1.5 font-(--font-sans)"
              >
                Action
              </label>
              <select
                id="schedule-action"
                value={action}
                onChange={(e) => setAction(e.target.value as "ON" | "OFF")}
                className="w-full min-h-11 px-3 bg-(--color-surface-2)/60 border border-(--color-border) rounded-(--radius-md) text-(--color-foreground) text-sm focus:ring-2 focus:ring-(--color-ring) focus:outline-none transition-colors"
              >
                <option value="ON">Turn ON</option>
                <option value="OFF">Turn OFF</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="schedule-time"
                className="block text-xs font-medium text-(--color-foreground-2) mb-1.5 font-(--font-sans)"
              >
                Scheduled Time
              </label>
              <input
                id="schedule-time"
                type="datetime-local"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full min-h-11 px-3 bg-(--color-surface-2)/60 border border-(--color-border) rounded-(--radius-md) text-(--color-foreground) text-sm focus:ring-2 focus:ring-(--color-ring) focus:outline-none transition-colors"
              />
            </div>
          </div>

          {error && <ErrorInline message={error} />}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="min-h-11 px-6 rounded-(--radius-md) bg-(--color-accent) text-slate-950 font-medium text-sm hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50 cursor-pointer focus:ring-2 focus:ring-(--color-ring) focus:outline-none"
          >
            {createMutation.isPending ? "Saving..." : "Save Schedule"}
          </button>
        </form>
      )}

      {isSchedulesLoading ? (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : schedules?.length === 0 ? (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) p-8 text-center text-sm text-(--color-foreground-2)">
          No scheduled actions registered.
        </div>
      ) : (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) overflow-hidden shadow-(--shadow-card)">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-(--color-border) bg-(--color-surface-2) text-xs font-semibold text-(--color-foreground-2)">
                  <th className="py-3 px-4">Appliance</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Scheduled Execution</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {schedules?.map((schedule) => {
                  const appliance = appliances?.find((a) => a.id === schedule.appliance_id)
                  const isExecuted = !!schedule.executed_at
                  return (
                    <tr key={schedule.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-(--color-foreground)">
                        {appliance?.name ?? `Appliance #${schedule.appliance_id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-bold font-(--font-mono) px-2.5 py-1 rounded-(--radius-sm) ${
                            schedule.action === "ON"
                              ? "bg-teal-950/80 border border-teal-800 text-(--color-accent)"
                              : "bg-slate-800 border border-slate-700 text-slate-300"
                          }`}
                        >
                          {schedule.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-(--font-mono) text-xs text-(--color-foreground-2)">
                        {new Date(schedule.scheduled_time).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {isExecuted ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Executed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(schedule.id)}
                          disabled={deleteMutation.isPending}
                          aria-label={`Delete schedule for ${appliance?.name ?? schedule.appliance_id}`}
                          className="min-h-9 min-w-9 p-2 rounded-(--radius-md) text-(--color-destructive) hover:bg-(--color-surface-2) transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center focus:ring-2 focus:ring-(--color-ring) focus:outline-none"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
