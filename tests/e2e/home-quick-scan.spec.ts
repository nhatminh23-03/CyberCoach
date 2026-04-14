import { expect, test } from "@playwright/test";

import { installCommonApiMocks, messageScanResult, urlScanResult } from "./backend-mocks";


test.describe("homepage quick scan routing", () => {
  test("routes a pasted URL into URL Scan and auto-runs the result", async ({ page }) => {
    await installCommonApiMocks(page);
    await page.route("**/api/scan/url", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(urlScanResult),
      });
    });

    await page.goto("/");
    await page.getByLabel("Quick Verification").fill("paypal-security-check-login.com/review");
    await page.getByRole("button", { name: "Quick Scan" }).click();

    await page.waitForURL(/\/scan\/url/);
    await expect(page.getByText(/URL SAFETY CHECK/i)).toBeVisible();
    await expect(page.getByText("High Risk")).toBeVisible();
    await expect(page.getByText(/Main concern/i)).toBeVisible();
  });

  test("routes a pasted message into Message Scan and auto-runs the result", async ({ page }) => {
    await installCommonApiMocks(page);
    await page.route("**/api/scan/message", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(messageScanResult),
      });
    });

    await page.goto("/");
    await page.getByLabel("Quick Verification").fill("My bank texted me and wants me to log in right away.");
    await page.getByRole("button", { name: "Quick Scan" }).click();

    await page.waitForURL(/\/scan\?/);
    await expect(page.getByText(/MESSAGE SAFETY CHECK/i)).toBeVisible();
    await expect(page.getByText("High Risk")).toBeVisible();
    await expect(page.getByText(/What To Do Next/i)).toBeVisible();
  });
});
