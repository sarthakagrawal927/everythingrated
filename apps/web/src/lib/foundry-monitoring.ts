"use client";

import { track } from "@saas-maker/posthog-client";

const PROJECT_SLUG = "everythingrated";

function route() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${window.location.pathname}`;
}

function messageFrom(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

type ErrorBoundaryScope = "root" | "global" | "item" | "directory" | "unknown";

/**
 * Emits an "error_captured" event for an error surfaced by a React error
 * boundary (error.tsx / global-error.tsx). Safe to call from the client —
 * no-ops gracefully if PostHog is not ready.
 */
export function captureError(
  error: unknown,
  options: { scope?: ErrorBoundaryScope; digest?: string; source?: string } = {},
) {
  try {
    track("error_captured", {
      project_slug: PROJECT_SLUG,
      route: route(),
      scope: options.scope ?? "unknown",
      digest: options.digest,
      source: options.source ?? "error_boundary",
      message: messageFrom(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  } catch {
    // Never let monitoring throw inside an error boundary.
  }
}

/**
 * Emits an "action_failed" event for a non-fatal failure (e.g. a Server
 * Action / network call that failed but did not crash a boundary).
 */
export function captureActionFailure(
  error: unknown,
  options: { action: string; source?: string } = { action: "unknown" },
) {
  try {
    track("action_failed", {
      project_slug: PROJECT_SLUG,
      route: route(),
      action: options.action,
      source: options.source ?? "client",
      message: messageFrom(error),
    });
  } catch {
    // Never let monitoring throw.
  }
}
