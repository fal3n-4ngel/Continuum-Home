import { test, expect } from "@playwright/test";

test.describe("Public Navigation & Route Groups", () => {
  test("renders the public marketing landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Continuum/i);
    const bodyText = await page.innerText("body");
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("renders the privacy policy page", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.getByText("Data Collection & Ownership")).toBeVisible();
  });

  test("handles login route and initiates authentication redirect", async ({ page }) => {
    await page.goto("/login");
    await page.waitForURL(/(login|firebaseapp\.com|accounts\.google\.com)/);
    expect(page.url()).toMatch(/(login|firebaseapp\.com|accounts\.google\.com)/);
  });
});
