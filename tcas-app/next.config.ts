import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI output during builds
  silent: true,
  // Source-map upload requires SENTRY_AUTH_TOKEN + org/project (CI only)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    // Remove source maps from deploy bundle after upload
    deleteSourcemapsAfterUpload: true,
  },
  // Disable Sentry telemetry
  telemetry: false,
});
