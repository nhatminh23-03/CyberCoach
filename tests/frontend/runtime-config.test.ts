import { describe, expect, it } from "vitest";

import { resolveBackendApiBase, resolveDirectBackendApiBase } from "@/lib/runtimeConfig";


describe("runtime config validation", () => {
  it("allows localhost fallback for local development", () => {
    expect(
      resolveBackendApiBase({
        nodeEnv: "development",
      }),
    ).toBe("http://127.0.0.1:8000/api");
  });

  it("rejects missing production backend api configuration", () => {
    expect(() =>
      resolveBackendApiBase({
        appEnv: "production",
      }),
    ).toThrow(/requires api_base_url or next_public_api_base_url/i);
  });

  it("rejects localhost backend api bases in production", () => {
    expect(() =>
      resolveBackendApiBase({
        appEnv: "production",
        apiBaseUrl: "http://127.0.0.1:8000/api",
      }),
    ).toThrow(/must not use a localhost backend api base/i);
  });

  it("allows browser-local direct backend fallback on localhost", () => {
    expect(
      resolveDirectBackendApiBase({
        appEnv: "production",
        browserHostname: "localhost",
        browserProtocol: "http:",
      }),
    ).toBe("http://localhost:8000/api");
  });

  it("rejects missing public direct backend config on non-local production hosts", () => {
    expect(() =>
      resolveDirectBackendApiBase({
        appEnv: "production",
        browserHostname: "cybercoach.example",
        browserProtocol: "https:",
      }),
    ).toThrow(/requires next_public_api_base_url/i);
  });
});
