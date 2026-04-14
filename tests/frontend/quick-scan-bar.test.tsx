import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuickScanBar } from "@/components/home/QuickScanBar";


const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));


describe("QuickScanBar", () => {
  beforeEach(() => {
    push.mockReset();
    window.sessionStorage.clear();
  });

  it("routes URL-like input to URL Scan with autorun enabled", () => {
    render(<QuickScanBar />);

    fireEvent.change(screen.getByLabelText(/quick verification/i), {
      target: { value: "paypal-login.example.com/reset" },
    });
    fireEvent.click(screen.getByRole("button", { name: /quick scan/i }));

    expect(push).toHaveBeenCalledWith(
      "/scan/url?q=paypal-login.example.com%2Freset&autorun=1&source=home",
    );
    expect(window.sessionStorage.getItem("cybercoach:quick-scan-input")).toBe("paypal-login.example.com/reset");
    expect(window.sessionStorage.getItem("cybercoach:url-scan-input")).toBe("paypal-login.example.com/reset");
  });

  it("routes message-like input to Message Scan with autorun enabled", () => {
    render(<QuickScanBar />);

    fireEvent.change(screen.getByLabelText(/quick verification/i), {
      target: { value: "My bank texted me and asked me to log in right now." },
    });
    fireEvent.click(screen.getByRole("button", { name: /quick scan/i }));

    expect(push).toHaveBeenCalledWith(
      "/scan?q=My+bank+texted+me+and+asked+me+to+log+in+right+now.&autorun=1&source=home",
    );
    expect(window.sessionStorage.getItem("cybercoach:quick-scan-input")).toBe(
      "My bank texted me and asked me to log in right now.",
    );
  });

  it("keeps the direct quick actions wired to their dedicated suites", () => {
    render(<QuickScanBar />);

    fireEvent.click(screen.getByRole("button", { name: /upload document/i }));
    expect(push).toHaveBeenLastCalledWith("/scan/document");

    fireEvent.click(screen.getByRole("button", { name: /scan screenshot/i }));
    expect(push).toHaveBeenLastCalledWith("/scan/screenshot");

    fireEvent.click(screen.getByRole("button", { name: /open call guard/i }));
    expect(push).toHaveBeenLastCalledWith("/scan/voice");
  });
});
