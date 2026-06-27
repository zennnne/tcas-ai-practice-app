import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_APP_ENV ?? "development";

/**
 * Initialise Sentry for the current runtime (client / server / edge).
 * No-ops in local dev or without a DSN, so it's safe to call unconditionally
 * from each runtime's entry config. Shared by all three to avoid drift.
 */
export function initSentry(): void {
  if (!dsn || environment === "development") return;
  Sentry.init({
    dsn,
    environment,
    sendDefaultPii: false,
    // Errors: always capture (100%). Traces: off (save free-tier quota).
    tracesSampleRate: 0,
    beforeSend: scrubPii,
  });
}

/** Remove PII fields from the request body before sending to Sentry. */
function scrubPii(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request?.data) {
    const raw = event.request.data;
    const data: Record<string, unknown> =
      typeof raw === "string" ? (tryParseJson(raw) ?? {}) : (raw as Record<string, unknown>);
    delete data.email;
    delete data.password;
    delete data.token;
    event.request.data = data;
  }
  return event;
}

function tryParseJson(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
}
