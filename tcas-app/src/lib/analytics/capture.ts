import { PostHog } from "posthog-node";

const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/**
 * Capture a conversion-funnel event for the given user. No-ops gracefully
 * when PostHog is not configured (local dev, tests, or missing key) —
 * mirrors the Sentry seam in `lib/monitoring/capture.ts`.
 *
 * Every call site in this app sits behind either the signup consent check
 * (`validateConsent` in auth.ts) or `withAuth` (which requires an
 * authenticated user — i.e. someone who already passed that consent check
 * at signup). So there is no code path that reaches this function for a
 * user who hasn't consented; no extra consent lookup is done here.
 *
 * Creates a short-lived client per call and shuts it down immediately after
 * sending, so the event isn't lost if the serverless function running this
 * server action / webhook handler freezes right after returning.
 */
export async function capture(
  event: string,
  distinctId: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  if (!apiKey) return;

  // Analytics must never break a user flow — swallow any send/shutdown error.
  try {
    const client = new PostHog(apiKey, { host, flushAt: 1, flushInterval: 0 });
    client.capture({ distinctId, event, properties });
    await client._shutdown();
  } catch {
    // best-effort telemetry; drop silently
  }
}
