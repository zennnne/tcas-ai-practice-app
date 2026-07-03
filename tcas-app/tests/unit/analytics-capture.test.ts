import { describe, it, expect, vi, beforeEach } from "vitest";

const captureMock = vi.fn();
const shutdownMock = vi.fn().mockResolvedValue(undefined);

// Regular (non-arrow) function so it can be used with `new` — the capture
// seam constructs `new PostHog(...)`, and arrow functions are not constructors.
vi.mock("posthog-node", () => ({
  PostHog: vi.fn().mockImplementation(function () {
    return { capture: captureMock, _shutdown: shutdownMock };
  }),
}));

// The module reads NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST at
// import time, so each test resets the module registry + env vars and
// re-imports to exercise a fresh module evaluation.
describe("analytics/capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  });

  it("no-ops when NEXT_PUBLIC_POSTHOG_KEY is absent (local dev / tests)", async () => {
    const { capture } = await import("@/lib/analytics/capture");
    await capture("signup", "user-1", { foo: "bar" });

    const { PostHog } = await import("posthog-node");
    expect(PostHog).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
    expect(shutdownMock).not.toHaveBeenCalled();
  });

  it("forwards event, distinctId and properties to PostHog when key is set", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    const { capture } = await import("@/lib/analytics/capture");
    await capture("trial_started", "user-42", { tier: "tier1" });

    const { PostHog } = await import("posthog-node");
    expect(PostHog).toHaveBeenCalledWith(
      "phc_test_key",
      expect.objectContaining({
        host: "https://us.i.posthog.com",
        flushAt: 1,
        flushInterval: 0,
      }),
    );
    expect(captureMock).toHaveBeenCalledWith({
      distinctId: "user-42",
      event: "trial_started",
      properties: { tier: "tier1" },
    });
    expect(shutdownMock).toHaveBeenCalledTimes(1);
  });

  it("works without properties (optional arg)", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    const { capture } = await import("@/lib/analytics/capture");
    await capture("upgrade_started", "user-7");

    expect(captureMock).toHaveBeenCalledWith({
      distinctId: "user-7",
      event: "upgrade_started",
      properties: undefined,
    });
  });

  it("uses NEXT_PUBLIC_POSTHOG_HOST override when provided", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
    const { capture } = await import("@/lib/analytics/capture");
    await capture("signup", "user-1");

    const { PostHog } = await import("posthog-node");
    expect(PostHog).toHaveBeenCalledWith(
      "phc_test_key",
      expect.objectContaining({ host: "https://eu.i.posthog.com" }),
    );
  });
});
