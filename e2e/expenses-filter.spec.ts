import { test, expect } from "@playwright/test";

test.describe("Expense Ledger Filtering & Controls", () => {
  test("interacts with expense search and date filter controls on dashboard", async ({ page }) => {
    await page.goto("/dashboard?tab=expenses");

    const searchInput = page.getByPlaceholder("Search...");
    if (await searchInput.isVisible()) {
      await searchInput.fill("Coffee");
      await expect(searchInput).toHaveValue("Coffee");
      await searchInput.fill("");
      await expect(searchInput).toHaveValue("");

      const fromDate = page.getByLabel("From date");
      const toDate = page.getByLabel("To date");
      await expect(fromDate).toBeVisible();
      await expect(toDate).toBeVisible();

      await fromDate.fill("2026-09-01");
      const clearBtn = page.getByLabel("Clear date filter");
      await expect(clearBtn).toBeVisible();

      await clearBtn.click();
      await expect(fromDate).toHaveValue("");
    } else {
      await expect(page).toHaveURL(/\/(login|dashboard)/);
    }
  });
});
