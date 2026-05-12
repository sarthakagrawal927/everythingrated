# Changelog

Behavioural changes to the rating, comparison, and moderation algorithms.
Anything visible to a visitor (different scores, different ordering, different
rating semantics) should land here so the team can correlate a "why did this
change?" question with a date.

Cosmetic, infra, and seed-data changes do not need entries; check `git log`.

## Unreleased

## 2026-05 — Directory moderation queue

- Anonymous visitors can suggest new directories via `/submit-directory`.
- Submissions pass through `validateDirectorySubmission` (length, aspect cap,
  case-insensitive dedup) and a moderator-token-gated approve/reject flow.
- Approved submissions become real directories with the suggested aspect set
  and an empty item list awaiting seeding.

## 2026-05 — Weighted comparison boards

- `/compare-journeys`-style boards weight each aspect's per-item score by a
  user-tunable 0–5 multiplier (`?w=key:value,...`), then divide by total
  weight to keep totals on the original 0–10 scale.
- Weights default to `1`; encoding drops any weight that equals `1` to keep
  shareable URLs short.
- Sort tie-breaks alphabetically on `item.name`.

## Earlier — Per-directory aspects + visitor cookie

- Schema split aspects per directory so an AI editor's axes (Quality, Cost,
  Workflow Fit) differ from a database's (Performance, Reliability, Ops).
- Ratings are scoped per `(item_id, aspect_id, visitor_id)`; re-rating
  upserts.
- Visitor identity is an httpOnly `er_visitor` UUID cookie minted only on the
  first `submitRating` Server Action, never on read pages, so crawlers don't
  pollute the visitor space.
