import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { captureException, captureMessage } from "@/lib/monitoring/capture";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe("monitoring/capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("captureException", () => {
    it("forwards the error to Sentry.captureException", () => {
      const err = new Error("something broke");
      captureException(err);
      expect(Sentry.captureException).toHaveBeenCalledWith(err, undefined);
    });

    it("wraps optional context as Sentry extra", () => {
      const err = new Error("billing failure");
      captureException(err, { userId: "u-123", orderId: "ord-456" });
      expect(Sentry.captureException).toHaveBeenCalledWith(err, {
        extra: { userId: "u-123", orderId: "ord-456" },
      });
    });
  });

  describe("captureMessage", () => {
    it("uses warning level by default", () => {
      captureMessage("webhook missing row");
      expect(Sentry.captureMessage).toHaveBeenCalledWith("webhook missing row", {
        level: "warning",
        extra: undefined,
      });
    });

    it("accepts a custom severity level", () => {
      captureMessage("paid but not activated", "error");
      expect(Sentry.captureMessage).toHaveBeenCalledWith("paid but not activated", {
        level: "error",
        extra: undefined,
      });
    });

    it("includes context as Sentry extra", () => {
      captureMessage("dedup collision", "warning", { chargeId: "chrg_001" });
      expect(Sentry.captureMessage).toHaveBeenCalledWith("dedup collision", {
        level: "warning",
        extra: { chargeId: "chrg_001" },
      });
    });
  });
});
