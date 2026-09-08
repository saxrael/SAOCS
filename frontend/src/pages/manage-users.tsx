import { useState, type FormEvent } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { UserPlus, Shield, ShieldCheck, CheckCircle2, AlertOctagon } from "lucide-react"
import { listUsers, registerUser } from "@/api/users"
import { PageHeader } from "@/components/page-header"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ErrorInline } from "@/components/error-inline"

export function ManageUsersPage() {
  const [email, setEmail] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  })

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setEmail("")
      setIsAdmin(false)
      setError(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Registration failed")
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    registerMutation.mutate({ email, is_admin: isAdmin })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Access Management"
        subtitle="Authorize team emails to authenticate via Google OAuth."
      />

      <form
        onSubmit={handleSubmit}
        className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) p-6 space-y-4 shadow-(--shadow-card)"
      >
        <h3 className="text-sm font-semibold font-(--font-display) text-(--color-foreground)">
          Register Authorized Email
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label
              htmlFor="user-email"
              className="block text-xs font-medium text-(--color-foreground-2) mb-1.5 font-(--font-sans)"
            >
              Google Account Email
            </label>
            <input
              id="user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-11 px-3 bg-(--color-surface-2)/60 border border-(--color-border) rounded-(--radius-md) text-sm focus:ring-2 focus:ring-(--color-ring) focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-11">
            <label htmlFor="grant-admin" className="flex items-center gap-2.5 cursor-pointer text-sm">
              <input
                id="grant-admin"
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="w-4 h-4 rounded border-(--color-border) bg-(--color-surface-2) text-(--color-accent) focus:ring-(--color-ring) cursor-pointer"
              />
              <span className="text-xs font-medium text-(--color-foreground-2)">Grant Administrator Role</span>
            </label>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="min-h-11 px-6 rounded-(--radius-md) bg-(--color-accent) text-slate-950 font-medium text-sm hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 focus:ring-2 focus:ring-(--color-ring) focus:outline-none"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>{registerMutation.isPending ? "Registering..." : "Register User"}</span>
            </button>
          </div>
        </div>

        {error && <ErrorInline message={error} />}
      </form>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) overflow-hidden shadow-(--shadow-card)">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-(--color-border) bg-(--color-surface-2) text-xs font-semibold text-(--color-foreground-2)">
                  <th className="py-3 px-4">Authorized Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {users?.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-(--color-foreground)">{user.email}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold font-(--font-mono) px-2.5 py-1 rounded-(--radius-sm) ${
                          user.is_admin
                            ? "bg-amber-950/80 border border-amber-800 text-amber-300"
                            : "bg-slate-800 border border-slate-700 text-slate-300"
                        }`}
                      >
                        {user.is_admin ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        ) : (
                          <Shield className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                        )}
                        {user.is_admin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-(--font-mono) text-xs text-(--color-foreground-2)">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {user.locked_at ? (
                        <span className="inline-flex items-center gap-1.5 text-(--color-destructive) font-medium">
                          <AlertOctagon className="w-3.5 h-3.5" aria-hidden="true" />
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
