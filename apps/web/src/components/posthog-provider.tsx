"use client";

import { useEffect } from "react";

import { PostHogProvider } from "@saas-maker/posthog-client";

import { trackReturnedOnce } from "@/lib/analytics";

/**
 * Session-level analytics. `returned` fires once per session for a visitor
 * with prior rating activity. `signup` / `activated` / `core_action` are
 * emitted server-side at their real trigger points (visitor.ts, actions.ts).
 */
function AnalyticsTracker() {
  useEffect(() => {
    // Self-gates: no-ops unless this visitor has prior activity and the
    // event has not already fired this session.
    trackReturnedOnce();
  }, []);
  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <AnalyticsTracker />
      {children}
    </PostHogProvider>
  );
}
