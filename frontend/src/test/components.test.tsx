import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { ToggleButton } from "@/components/toggle-button"
import { ErrorInline } from "@/components/error-inline"
import { ConnectionStatusBanner } from "@/components/connection-status-banner"
import { PageHeader } from "@/components/page-header"
import { LoadingSpinner } from "@/components/loading-spinner"
import { NavBar } from "@/components/nav-bar"
import { NotFoundPage } from "@/pages/not-found"
import * as useAuthModule from "@/hooks/use-auth"

describe("ToggleButton", () => {
  it("renders Turn On when off and handles click", () => {
    const handleClick = vi.fn()
    render(
      <ToggleButton
        isOn={false}
        isLoading={false}
        onClick={handleClick}
        ariaLabel="Toggle appliance"
      />,
    )

    const button = screen.getByRole("button", { name: "Toggle appliance" })
    expect(button).toBeDefined()
    expect(button.textContent).toContain("Turn On")

    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("renders Turn Off when on", () => {
    const handleClick = vi.fn()
    render(
      <ToggleButton
        isOn={true}
        isLoading={false}
        onClick={handleClick}
        ariaLabel="Toggle appliance"
      />,
    )

    const button = screen.getByRole("button", { name: "Toggle appliance" })
    expect(button.textContent).toContain("Turn Off")
  })

  it("disables button and displays spinner when loading", () => {
    const handleClick = vi.fn()
    render(
      <ToggleButton
        isOn={false}
        isLoading={true}
        onClick={handleClick}
        ariaLabel="Toggle appliance"
      />,
    )

    const button = screen.getByRole("button", { name: "Toggle appliance" })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })
})

describe("ErrorInline", () => {
  it("renders error message correctly", () => {
    render(<ErrorInline message="Test error message" />)
    expect(screen.getByRole("alert")).toBeDefined()
    expect(screen.getByText("Test error message")).toBeDefined()
  })

  it("renders null when message is empty", () => {
    const { container } = render(<ErrorInline message="" />)
    expect(container.firstChild).toBeNull()
  })
})

describe("ConnectionStatusBanner", () => {
  it("renders null when connected", () => {
    const { container } = render(<ConnectionStatusBanner status="CONNECTED" />)
    expect(container.firstChild).toBeNull()
  })

  it("renders reconnecting message when connecting", () => {
    render(<ConnectionStatusBanner status="CONNECTING" />)
    expect(screen.getByRole("status")).toBeDefined()
    expect(screen.getByText(/Reconnecting to real-time service/i)).toBeDefined()
  })

  it("renders disconnected message when disconnected", () => {
    render(<ConnectionStatusBanner status="DISCONNECTED" />)
    expect(screen.getByRole("status")).toBeDefined()
    expect(screen.getByText(/Disconnected from broker/i)).toBeDefined()
  })
})

describe("PageHeader", () => {
  it("renders title, subtitle, and action slot", () => {
    render(
      <PageHeader title="Overview" subtitle="System stats">
        <button type="button">Action</button>
      </PageHeader>,
    )

    expect(screen.getByText("Overview")).toBeDefined()
    expect(screen.getByText("System stats")).toBeDefined()
    expect(screen.getByText("Action")).toBeDefined()
  })
})

describe("LoadingSpinner", () => {
  it("renders with status role and accessible label", () => {
    render(<LoadingSpinner size="lg" />)
    expect(screen.getByRole("status")).toBeDefined()
    expect(screen.getByLabelText("Loading")).toBeDefined()
  })
})

describe("NavBar", () => {
  it("hides admin links when user is regular user", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
        email: "user@example.com",
        is_admin: false,
        created_at: "2026-09-08T00:00:00Z",
        failed_login_attempts: 0,
        locked_at: null,
      },
      isAdmin: false,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    )

    expect(screen.getAllByText("Dashboard").length).toBe(2)
    expect(screen.getAllByText("Schedule").length).toBe(2)
    expect(screen.getAllByText("Activity Log").length).toBe(2)
    expect(screen.queryByText("Manage Users")).toBeNull()
    expect(screen.getByText("user@example.com")).toBeDefined()
  })

  it("displays admin link and badge when user is admin", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 2,
        email: "admin@example.com",
        is_admin: true,
        created_at: "2026-09-08T00:00:00Z",
        failed_login_attempts: 0,
        locked_at: null,
      },
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    )

    expect(screen.getAllByText("Manage Users").length).toBeGreaterThan(0)
    expect(screen.getByText("Admin")).toBeDefined()
  })
})

describe("NotFoundPage", () => {
  it("renders 404 header and link to dashboard", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByText("404")).toBeDefined()
    expect(screen.getByText("Page Not Found")).toBeDefined()
    expect(screen.getByRole("link", { name: /Return to Dashboard/i })).toBeDefined()
  })
})
