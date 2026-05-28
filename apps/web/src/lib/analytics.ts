/**
 * Owner-facing analytics — the fixed 4-event taxonomy.
 *
 * Every fleet project emits exactly these four events — `signup`, `activated`,
 * `core_action`, `returned` — so a single PostHog project can build one
 * cross-fleet funnel (signup -> activated -> core_action) and a D1/D7 retention
 * insight, with no custom dashboard.
 *
 * Every event carries `project_id: "everythingrated"`. This wrapper is
 * intentionally thin so it can later be promoted into
 * `posthog-js`.
 *
 * everythingrated has NO auth — ratings are anonymous, identified by the
 * `er_visitor` cookie. The taxonomy maps onto that model:
 *  - `signup`      — the `er_visitor` cookie is minted (first identified visit).
 *  - `activated`   — the visitor's first rating (first real product value).
 *  - `core_action` — each rating submitted (`rating_submitted`).
 *  - `returned`    — a session by a visitor who already has a cookie + activity.
 *
 * It is isomorphic: in the browser it routes through `posthog-js`
 * (`track`); inside a server action it posts directly to the PostHog capture
 * API via a raw fetch (no `posthog-node`).
 *
 * The browser `track` is loaded via a dynamic `import()` so this module is
 * safe to import from a server module (e.g. `visitor.ts`, used by Server
 * Components) without pulling `posthog-js` — which calls `createContext` — into
 * the server bundle.
 */

const PROJECT = "everythingrated" as const;

// Shared with foundry-monitoring.ts — same PostHog project.
const POSTHOG_KEY = "phc_qgiAarw4Co4pw9fz3Fxj4UJaHmqzFetqs4JrXhGc35Nd";
const POSTHOG_HOST = "https://us.i.posthog.com";

/** The product-specific action behind a `core_action` event. */
export type CoreAction =
  /** A visitor rated an item on one aspect. */
  "rating_submitted";

interface AnalyticsEventMap {
  /** First identified visit — the `er_visitor` cookie was minted. */
  signup: { project_id: typeof PROJECT };
  /** The visitor reaches first real value — their first submitted rating. */
  activated: { project_id: typeof PROJECT };
  /** The thing the product exists to do. */
  core_action: { project_id: typeof PROJECT; action: CoreAction };
  /** A return session by a visitor with prior activity. */
  returned: { project_id: typeof PROJECT };
}

function emitServer(
  event: string,
  props: Record<string, unknown>,
  distinctId?: string,
) {
  // Fire-and-forget: analytics must never block or break a server action.
  void fetch(`${POSTHOG_HOST}/i/v0/e/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event,
      distinct_id: distinctId ?? `${PROJECT}-server`,
      properties: props,
    }),
  }).catch(() => {
    // Swallow — best-effort only.
  });
}

function emitBrowser(event: string, payload: Record<string, unknown>): void {
  // Dynamically import the browser PostHog client so `posthog-js` is never
  // pulled into a server bundle. Fire-and-forget; never throws upward.
  void import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.capture(event, payload);
    })
    .catch(() => {
      // Swallow — analytics must never break a user flow.
    });
}

export function trackEvent(
  event: string,
  properties: Record<string, unknown> = {},
  distinctId?: string,
): void {
  const payload = { project_id: PROJECT, ...properties };
  try {
    if (typeof window === "undefined") {
      emitServer(event, payload, distinctId);
    } else {
      emitBrowser(event, payload);
    }
  } catch {
    // Analytics must NEVER break a user flow. Swallow and move on.
  }
}

function emit<K extends keyof AnalyticsEventMap>(
  event: K,
  props: Omit<AnalyticsEventMap[K], "project_id">,
  distinctId?: string,
): void {
  trackEvent(event, props, distinctId);
}

/**
 * Fire once, when the `er_visitor` cookie is first minted — the
 * anonymous-product equivalent of an account being created.
 * Pass the visitor id so the event attaches to the right person.
 */
export function trackSignup(distinctId?: string): void {
  emit("signup", {}, distinctId);
}

/** Fire once, when the visitor submits their first rating. */
export function trackActivated(distinctId?: string): void {
  emit("activated", {}, distinctId);
}

/** Fire on each completion of the core product action. */
export function trackCoreAction(action: CoreAction, distinctId?: string): void {
  emit("core_action", { action }, distinctId);
}

/** Fire on session start for a visitor who has prior activity. */
export function trackReturned(distinctId?: string): void {
  emit("returned", {}, distinctId);
}

/**
 * Feature-level monitoring for the comparison shortlist. This intentionally
 * sits outside the fixed funnel taxonomy above.
 */
export function trackCompareViewOpened({
  directory,
  itemCount,
}: {
  directory: string;
  itemCount: number;
}): void {
  if (typeof window === "undefined") return;
  try {
    emitBrowser("compare_view_opened", {
      project_id: PROJECT,
      directory,
      item_count: itemCount,
    });
  } catch {
    // Analytics must never break comparison.
  }
}

// --- Browser session gating for `returned` ---------------------------------
//
// The `er_visitor` cookie is httpOnly, so the client can't read it. Instead we
// keep two browser markers: a durable "has rated before" flag in localStorage
// (set the first time a rating succeeds) and a per-session flag in
// sessionStorage. `returned` fires once per session for a visitor who has
// prior activity — exactly what the D1/D7 retention insight needs.

const ACTIVITY_KEY = "er:analytics-has-activity";
const SESSION_KEY = "er:analytics-session-fired";

/** Mark that this visitor has prior activity. Call after a rating succeeds. */
export function markVisitorActivity(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVITY_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Fire `returned` once per session, only for a visitor with prior activity.
 * Safe to call on every page load — self-gates.
 */
export function trackReturnedOnce(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(ACTIVITY_KEY) !== "1") return;
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    return;
  }
  trackReturned();
}
