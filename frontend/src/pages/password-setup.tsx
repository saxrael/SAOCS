import { useState, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { useAuth } from "@/hooks/use-auth"
import { ErrorInline } from "@/components/error-inline"

export function PasswordSetupPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchParams] = useSearchParams()
  const { setupPassword } = useAuth()
  const navigate = useNavigate()
  const setupToken = searchParams.get("token")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!setupToken) {
      setError("Missing setup token. Please initiate sign in with Google again.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      await setupPassword({ password }, setupToken)
      navigate("/", { replace: true })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to set up password.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-(--color-background) flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-(--color-surface) rounded-(--radius-lg) border border-(--color-border) p-8 shadow-(--shadow-card)">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-(--color-surface-2) border border-(--color-border) mb-3">
            <span className="w-4 h-4 rounded-full bg-(--color-accent)" />
          </div>
          <h1 className="text-xl font-bold font-(--font-display) text-(--color-foreground)">
            Set Fallback Password
          </h1>
          <p className="text-xs text-(--color-foreground-2) mt-1 font-(--font-sans)">
            Create a password for subsequent logins without Google OAuth.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-medium text-(--color-foreground-2) mb-1.5 font-(--font-sans)"
            >
              New Password (minimum 8 characters)
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-11 px-3 bg-(--color-surface-2)/60 border border-(--color-border) rounded-(--radius-md) text-(--color-foreground) text-sm focus:ring-2 focus:ring-(--color-ring) focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-xs font-medium text-(--color-foreground-2) mb-1.5 font-(--font-sans)"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full min-h-11 px-3 bg-(--color-surface-2)/60 border border-(--color-border) rounded-(--radius-md) text-(--color-foreground) text-sm focus:ring-2 focus:ring-(--color-ring) focus:outline-none transition-colors"
            />
          </div>

          {error && <ErrorInline message={error} />}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-11 rounded-(--radius-md) bg-(--color-accent) text-slate-950 font-medium text-sm hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50 focus:ring-2 focus:ring-(--color-ring) focus:outline-none cursor-pointer mt-2"
          >
            {isSubmitting ? "Setting password..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  )
}
