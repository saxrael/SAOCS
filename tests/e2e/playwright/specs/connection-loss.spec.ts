import { test, expect } from "@playwright/test"
import { LoginPage } from "../pages/login.page"
import { DashboardPage } from "../pages/dashboard.page"

const TEST_EMAIL = process.env.TEST_EMAIL ?? "israelanuoluwaposimi955@gmail.com"
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ""

test.describe("Connection Loss E2E", () => {
  test("connection banner shows disconnected on WebSocket drop", async ({ page, context }) => {
    test.skip(!TEST_PASSWORD, "TEST_PASSWORD env var required")

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD)

    const dashboardPage = new DashboardPage(page)
    await expect(dashboardPage.connectionBanner).not.toBeVisible()

    await context.setOffline(true)

    await expect(dashboardPage.connectionBanner).toContainText(
      /disconnected|reconnecting|outdated/i,
      { timeout: 15000 }
    )

    await page.screenshot({ path: "playwright-report/disconnected-banner.png" })

    await context.setOffline(false)

    await expect(dashboardPage.connectionBanner).not.toBeVisible({
      timeout: 30000,
    })
  })
})
