import { NavLink } from "react-router"
import { LayoutDashboard, CalendarClock, History, Users, LogOut, ShieldCheck } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function NavBar() {
  const { user, isAdmin, logout } = useAuth()

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/schedule", label: "Schedule", icon: CalendarClock, end: false },
    { to: "/activity-log", label: "Activity Log", icon: History, end: false },
    ...(isAdmin ? [{ to: "/manage-users", label: "Manage Users", icon: Users, end: false }] : []),
  ]

  return (
    <>
      <header className="bg-(--color-surface) border-b border-(--color-border) sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-(--color-ring) rounded-md p-1">
              <span className="w-3 h-3 rounded-full bg-(--color-accent)" />
              <span className="font-bold text-lg tracking-wider font-(--font-display) text-(--color-foreground)">
                SAOCS
              </span>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-(--radius-md) text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-(--color-ring) ${
                      isActive
                        ? "bg-(--color-surface-2) text-(--color-accent) font-semibold"
                        : "text-(--color-foreground-2) hover:text-(--color-foreground) hover:bg-(--color-surface-2)/60"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-right">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-mono text-(--color-foreground) leading-none">
                    {user.email}
                  </span>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300 mt-1 uppercase font-semibold">
                      <ShieldCheck className="w-3 h-3 text-amber-400" aria-hidden="true" />
                      Admin
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              aria-label="Sign out of account"
              className="min-w-11 min-h-11 px-3 py-2 rounded-(--radius-md) border border-(--color-border) bg-(--color-surface-2) text-(--color-foreground-2) hover:text-(--color-foreground) hover:bg-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-(--color-ring) cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-(--color-destructive)" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-(--color-surface) border-t border-(--color-border) pb-safe"
      >
        <div className="grid grid-flow-col auto-cols-fr h-14">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-h-11 px-1 py-1 text-[10px] font-medium transition-colors ${
                  isActive
                    ? "text-(--color-accent)"
                    : "text-(--color-foreground-2) hover:text-(--color-foreground)"
                }`
              }
            >
              <item.icon className="w-5 h-5 mb-0.5" aria-hidden="true" />
              <span className="truncate max-w-full">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
