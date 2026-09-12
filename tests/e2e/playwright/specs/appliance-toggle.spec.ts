import { test, expect } from "@playwright/test"
import { LoginPage } from "../pages/login.page"
import { DashboardPage } from "../pages/dashboard.page"

const TEST_EMAIL = process.env.TEST_EMAIL ?? "israelanuoluwaposimi955@gmail.com"
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ""
const TEST_APPLIANCE = process.env.TEST_APPLIANCE ?? "Ceiling Light"

test.describe("Appliance Toggle E2E", () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_PASSWORD, "TEST_PASSWORD env var required")

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD)
    dashboardPage = new DashboardPage(page)
  })

  test("toggle appliance shows pending then confirms", async ({ page }) => {
    const currentState = await dashboardPage.getTileState(TEST_APPLIANCE)
    const targetState = currentState.includes("ON") ? "OFF" : "ON"

    await dashboardPage.toggleAppliance(TEST_APPLIANCE)

    await dashboardPage.waitForStateChange(TEST_APPLIANCE, targetState)

    const newState = await dashboardPage.getTileState(TEST_APPLIANCE)
    expect(newState).toContain(targetState)

    await page.screenshot({ path: "playwright-report/toggle-confirmed.png" })
  })

  test("state change reflects in second browser tab", async ({ context }) => {
    const page2 = await context.newPage()
    const loginPage2 = new LoginPage(page2)
    await loginPage2.goto()
    await loginPage2.login(TEST_EMAIL, TEST_PASSWORD)
    const dashboard2 = new DashboardPage(page2)

    const currentState = await dashboardPage.getTileState(TEST_APPLIANCE)
    const targetState = currentState.includes("ON") ? "OFF" : "ON"

    await dashboardPage.toggleAppliance(TEST_APPLIANCE)

    await dashboard2.waitForStateChange(TEST_APPLIANCE, targetState)

    const tab2State = await dashboard2.getTileState(TEST_APPLIANCE)
    expect(tab2State).toContain(targetState)

    await page2.close()
  })
})
