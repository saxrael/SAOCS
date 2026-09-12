import { test, expect } from "@playwright/test"
import { LoginPage } from "../pages/login.page"
import { DashboardPage } from "../pages/dashboard.page"

const TEST_EMAIL = process.env.TEST_EMAIL ?? "israelanuoluwaposimi955@gmail.com"
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ""

test.describe("Post-Deploy Smoke", () => {
  test("login page renders correctly", async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.submitButton).toBeVisible()
    await expect(loginPage.googleButton).toBeVisible()
  })

  test("login with valid credentials reaches dashboard", async ({ page }) => {
    test.skip(!TEST_PASSWORD, "TEST_PASSWORD env var required")

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD)

    const dashboardPage = new DashboardPage(page)
    await expect(dashboardPage.applianceTiles.first()).toBeVisible()
  })

  test("dashboard shows WebSocket connected status", async ({ page }) => {
    test.skip(!TEST_PASSWORD, "TEST_PASSWORD env var required")

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD)

    const dashboardPage = new DashboardPage(page)
    await expect(dashboardPage.connectionBanner).not.toBeVisible()
  })

  test("API health endpoint returns ok", async ({ request }) => {
    const response = await request.get("/api/health")
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.status).toBe("ok")
    expect(body.database).toBe("ok")
  })

  test("API version endpoint returns git SHA", async ({ request }) => {
    const response = await request.get("/api/version")
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.git_sha).toBeTruthy()
    expect(body.git_sha).not.toBe("unknown")
  })
})
