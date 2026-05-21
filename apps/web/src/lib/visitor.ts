import { cookies } from "next/headers";
import { trackSignup } from "./analytics";

export const VISITOR_COOKIE = "er_visitor";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Returns the visitor's existing cookie id, or null if absent.
 * Reading-only — safe in pages and Server Components.
 */
export async function readVisitorId(): Promise<string | null> {
  const c = await cookies();
  return c.get(VISITOR_COOKIE)?.value ?? null;
}

/**
 * Returns the visitor's id, minting + writing a new cookie if needed.
 * Only callable in Server Actions / Route Handlers (where cookies are
 * mutable). For read-only contexts, prefer `readVisitorId`.
 */
export async function ensureVisitorId(): Promise<string> {
  const c = await cookies();
  const existing = c.get(VISITOR_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  c.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  // Analytics — `signup`: a new visitor was identified (cookie minted). This
  // is the anonymous-product equivalent of an account being created, and
  // fires at most once per visitor (the cookie persists for a year).
  trackSignup(id);
  return id;
}
