import { type Page, type Locator } from "@playwright/test"

export class DashboardPage {
  readonly page: Page
  readonly connectionBanner: Locator
  readonly applianceTiles: Locator
  readonly energySummary: Locator

  constructor(page: Page) {
    this.page = page
    this.connectionBanner = page.locator("[data-testid='connection-status']")
    this.applianceTiles = page.locator("[data-testid='appliance-tile']")
    this.energySummary = page.locator("[data-testid='energy-summary']")
  }

  async goto() {
    await this.page.goto("/dashboard")
    await this.page.waitForLoadState("networkidle")
  }

  async getConnectionStatus(): Promise<string> {
    return (await this.connectionBanner.textContent()) ?? ""
  }

  async getTileState(applianceName: string): Promise<string> {
    const tile = this.applianceTiles.filter({ hasText: applianceName })
    const stateIndicator = tile.locator("[data-testid='state-text']")
    return (await stateIndicator.textContent()) ?? ""
  }

  async toggleAppliance(applianceName: string) {
    const tile = this.applianceTiles.filter({ hasText: applianceName })
    const toggleButton = tile.getByRole("button")
    await toggleButton.click()
  }

  async waitForStateChange(applianceName: string, expectedState: string) {
    const tile = this.applianceTiles.filter({ hasText: applianceName })
    const stateIndicator = tile.locator("[data-testid='state-text']")
    await stateIndicator.filter({ hasText: expectedState }).waitFor({ timeout: 5000 })
  }
}
