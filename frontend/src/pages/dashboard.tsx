import { useQuery } from "@tanstack/react-query"
import { Zap, CircleDollarSign } from "lucide-react"
import { listAppliances } from "@/api/appliances"
import { listActivityLogs } from "@/api/activity-log"
import { ApplianceTile } from "@/components/appliance-tile"
import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { ErrorInline } from "@/components/error-inline"
import { computeDailyEnergy } from "@/lib/utils"

export function DashboardPage() {
  const { data: appliances, isLoading: isAppliancesLoading, error: appliancesError } = useQuery({
    queryKey: ["appliances"],
    queryFn: listAppliances,
  })

  const { data: logs } = useQuery({
    queryKey: ["activity-log", { limit: 100 }],
    queryFn: () => listActivityLogs({ limit: 100 }),
  })

  if (isAppliancesLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (appliancesError) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Appliance Controls"
          subtitle="Real-time status and relay control for office appliances."
        />
        <ErrorInline message="Failed to load appliances. Please check your network connection." />
      </div>
    )
  }

  const { totalKwh, totalCost } = computeDailyEnergy(appliances || [], logs || [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Appliance Controls"
          subtitle="Real-time status and relay control for office appliances."
        />
        <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) p-4 flex items-center gap-6 shadow-(--shadow-card)">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-(--radius-md) bg-(--color-surface-2) border border-(--color-border) flex items-center justify-center">
              <Zap className="w-5 h-5 text-(--color-accent)" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-(--color-foreground-2) uppercase tracking-wider">
                Est. Today Energy
              </div>
              <div className="text-lg font-bold font-(--font-mono) text-(--color-accent)">
                {totalKwh.toFixed(2)} <span className="text-xs text-(--color-foreground-2)">kWh</span>
              </div>
            </div>
          </div>

          <div className="border-l border-(--color-border) pl-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-(--radius-md) bg-(--color-surface-2) border border-(--color-border) flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-(--color-foreground-2) uppercase tracking-wider">
                Est. Cost (Band A)
              </div>
              <div className="text-lg font-bold font-(--font-mono) text-(--color-foreground)">
                ₦{totalCost.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {appliances?.map((appliance) => (
          <ApplianceTile key={appliance.id} appliance={appliance} />
        ))}
      </div>
    </div>
  )
}
