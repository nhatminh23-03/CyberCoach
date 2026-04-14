import { expect, test } from "@playwright/test";

import { documentScanResult, installCommonApiMocks, voiceUploadResult } from "./backend-mocks";


test.describe("upload flows", () => {
  test("document scan upload renders results after analysis", async ({ page }) => {
    await installCommonApiMocks(page);
    await page.route("**/api/scan/document", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(documentScanResult),
      });
    });

    await page.goto("/scan/document");
    await page.locator('input[type="file"]').setInputFiles({
      name: "invoice.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("fake-document"),
    });
    await page.getByRole("button", { name: /check document/i }).click();

    await expect(page.getByText("High Risk")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Document X-Ray/i })).toBeVisible();
  });

  test("call guard upload mode accepts a recording and renders a finished result", async ({ page }) => {
    await installCommonApiMocks(page);
    await page.route("**/api/scan/voice/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(voiceUploadResult),
      });
    });

    await page.goto("/scan/voice");
    await page.getByRole("button", { name: /Upload Recording/i }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "call.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("fake-video"),
    });
    await page.getByRole("button", { name: /Analyze Recording/i }).click();

    await expect(page.getByText("High Risk")).toBeVisible();
    await expect(page.getByText(/What To Do Next/i)).toBeVisible();
  });
});
