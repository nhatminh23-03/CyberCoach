import { expect, test } from "@playwright/test";

import { installCommonApiMocks, messageScanResult } from "./backend-mocks";


test.describe("non-real-time result discovery", () => {
  test("shows a See Results CTA when completed results land below the fold", async ({ page }) => {
    await installCommonApiMocks(page);
    await page.route("**/api/scan/message", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(messageScanResult),
      });
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/scan");

    await page.getByPlaceholder("Paste a suspicious text, email, or chat message here").fill(
      "This is a suspicious message with a login request.",
    );
    await page.getByRole("button", { name: "Check Message" }).click();

    const cta = page.getByRole("button", { name: /See Results/i });
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page.getByText("Risk Summary")).toBeVisible();
  });
});
