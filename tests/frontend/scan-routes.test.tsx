import { describe, expect, it } from "vitest";


describe("scan route pages", () => {
  it("passes homepage autorun query into Message Scan", async () => {
    const { default: ScanPage } = await import("@/app/scan/page");
    const element = ScanPage({
      searchParams: {
        q: "Verify my account",
        autorun: "1",
      },
    });

    expect(element.type.name).toBe("MessageScanPage");
    expect(element.props.initialQuery).toBe("Verify my account");
    expect(element.props.initialAutoRun).toBe(true);
  });

  it("routes view=url into URL Scan", async () => {
    const { default: ScanPage } = await import("@/app/scan/page");
    const element = ScanPage({
      searchParams: {
        q: "https://paypal-security-check-login.com",
        view: "url",
        autorun: "true",
      },
    });

    expect(element.type.name).toBe("UrlScanPage");
    expect(element.props.initialQuery).toBe("https://paypal-security-check-login.com");
    expect(element.props.initialAutoRun).toBe(true);
  });

  it("keeps the dedicated URL route aligned with q and autorun", async () => {
    const { default: UrlScanRoute } = await import("@/app/scan/url/page");
    const element = UrlScanRoute({
      searchParams: {
        q: "example.com/reset",
        autorun: "yes",
      },
    });

    expect(element.type.name).toBe("UrlScanPage");
    expect(element.props.initialQuery).toBe("example.com/reset");
    expect(element.props.initialAutoRun).toBe(true);
  });
});
