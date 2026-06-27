import * as Sentry from "@sentry/nextjs";

type SentryLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

/**
 * Capture an unexpected exception. No-ops gracefully when Sentry is not
 * initialised (local dev or missing DSN).
 */
export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

/**
 * Capture a business-logic alert (billing anomalies, webhook failures, etc.).
 * Default level is "warning".
 */
export function captureMessage(
  message: string,
  level: SentryLevel = "warning",
  context?: Record<string, unknown>,
): void {
  Sentry.captureMessage(message, { level, extra: context });
}
