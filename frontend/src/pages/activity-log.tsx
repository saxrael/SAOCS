import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Download, ChevronLeft, ChevronRight, Zap, Power } from "lucide-react"
import { listActivityLogs, downloadExport } from "@/api/activity-log"
import { listAppliances } from "@/api/appliances"
import { useAuth } from "@/hooks/use-auth"
import { PageHeader } from "@/components/page-header"
import { LoadingSpinner } from "@/components/loading-spinner"

export function ActivityLogPage() {
  const [selectedAppliance, setSelectedAppliance] = useState<number | undefined>(undefined)
  const [offset, setOffset] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const limit = 50
  const { isAdmin } = useAuth()

  const { data: appliances } = useQuery({
    queryKey: ["appliances"],
    queryFn: listAppliances,
  })

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-log", { appliance_id: selectedAppliance, offset, limit }],
    queryFn: () =>
      listActivityLogs({
        appliance_id: selectedAppliance,
        offset,
        limit,
      }),
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await downloadExport()
    } catch {
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Activity Audit Log"
          subtitle="Immutable operational record of all power state transitions."
        />
        <div className="flex items-center gap-3">
          <select
            value={selectedAppliance ?? ""}
            onChange={(e) => {
              setOffset(0)
              setSelectedAppliance(e.target.value ? Number(e.target.value) : undefined)
            }}
            aria-label="Filter by appliance"
            className="min-h-11 px-3 bg-(--color-surface) border border-(--color-border) rounded-(--radius-md) text-sm focus:ring-2 focus:ring-(--color-ring) focus:outline-none transition-colors"
          >
            <option value="">All Appliances</option>
            {appliances?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {isAdmin && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="min-h-11 px-4 rounded-(--radius-md) bg-(--color-surface-2) border border-(--color-border) text-(--color-foreground) font-medium text-sm hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 focus:ring-2 focus:ring-(--color-ring) focus:outline-none"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : logs?.length === 0 && offset === 0 ? (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) p-8 text-center text-sm text-(--color-foreground-2)">
          No audit entries recorded for the current filter.
        </div>
      ) : (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) overflow-hidden shadow-(--shadow-card)">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-(--color-border) bg-(--color-surface-2) text-xs font-semibold text-(--color-foreground-2)">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Appliance</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {logs?.map((entry) => {
                  const isOn = entry.event_type.includes("ON")
                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-(--font-mono) text-xs text-(--color-foreground-2) whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-(--color-foreground)">
                        {entry.appliance_name ?? `Appliance #${entry.appliance_id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold font-(--font-mono) px-2.5 py-0.5 rounded-(--radius-sm) ${
                            isOn
                              ? "bg-teal-950/80 border border-teal-800 text-(--color-accent)"
                              : "bg-slate-800 border border-slate-700 text-slate-300"
                          }`}
                        >
                          {isOn ? (
                            <Zap className="w-3 h-3 text-(--color-accent)" aria-hidden="true" />
                          ) : (
                            <Power className="w-3 h-3 text-slate-400" aria-hidden="true" />
                          )}
                          {entry.event_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs uppercase font-mono text-(--color-foreground-2)">
                        {entry.source}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-(--font-mono) text-(--color-foreground-2)">
                        {entry.actor_email ?? "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-(--color-border) flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="min-h-9 px-4 rounded-(--radius-md) border border-(--color-border) bg-(--color-surface-2)/60 text-xs font-medium disabled:opacity-40 cursor-pointer flex items-center gap-1 hover:bg-(--color-surface-2) transition-colors focus:ring-2 focus:ring-(--color-ring) focus:outline-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-mono text-(--color-foreground-2)">
              Offset {offset}
            </span>
            <button
              type="button"
              onClick={() => setOffset(offset + limit)}
              disabled={(logs?.length ?? 0) < limit}
              className="min-h-9 px-4 rounded-(--radius-md) border border-(--color-border) bg-(--color-surface-2)/60 text-xs font-medium disabled:opacity-40 cursor-pointer flex items-center gap-1 hover:bg-(--color-surface-2) transition-colors focus:ring-2 focus:ring-(--color-ring) focus:outline-none"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
