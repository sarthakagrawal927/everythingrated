# Plan 0002 — EverythingRated consumes high-signal

**Status:** **DEFERRED** (2026-04-26) — design retained for future revisit, not the next iteration.
**Created:** 2026-04-26
**Parallel:** see `0001-time-evolving-ratings.md` for user-rating time bucketing — this plan inherits its window definitions.

## Why deferred

After picking Option B I challenged the premise. Conclusion: integrating with high-signal now is overconnection for a v0 POC.

- **Reuse is shallow.** Net real reuse from high-signal = Reddit adapter + HN adapter + Modal cron (~2.5 days saved). FinBERT is wrong for dev-tool slang (noted in §"Diff inside high-signal" item 6), the entity gazetteer is different, signal cards and the hit-rate ledger are out of scope.
- **Coupling is forever.** Every change to `entities.{collection,slug}` or `events.{sentimentLabel,sentimentScore,intent}` in high-signal becomes a breaking change for this repo. EverythingRated's prod-readiness now depends on high-signal's, and high-signal's own README says "research artifact first, product later, if at all".
- **Option B is worst-of-both.** It rejects Option C (shared `signal-engine` package) as YAGNI on the basis that only one consumer exists. But with one consumer, the right answer is *no cross-repo wiring at all* — either Option C when a third consumer appears, or EverythingRated grows ~50 lines of its own Reddit polling and skips cross-service entirely.
- **Wrong v0 question.** EverythingRated v0 is testing whether multi-axis ratings + time-evolution feels right. External sentiment is nice-to-have, not the question being answered. Plan `0001-time-evolving-ratings.md` is what matters now.

**Trigger to revisit:**
1. EverythingRated rating UX is validated against real users (≥ 50 raters across ≥ 5 items, signal that the multi-axis frame is the right frame), AND
2. high-signal has shipped its own AI-infra wedge to a state the owner would call "production reliable", AND
3. A third consumer of signal data has appeared (or is concretely planned), making Option C reuse genuinely justified.

If only (1) and (2) are true, prefer EverythingRated growing ~50 lines of standalone Reddit/HN polling over re-opening this plan. If all three are true, **revisit Option C, not Option B** — the analysis below was written assuming B, and the producer-side commitments in `high-signal/plans/0003-multi-collection-for-everythingrated.md` are also deferred and may need to be reframed entirely.

The design below is preserved verbatim because the API contract, intent taxonomy, caching strategy, and entity-resolution scheme remain useful regardless of whether the eventual integration is B or C.

---

## Problem statement

EverythingRated (multi-axis ratings POC, niche = AI dev tools) needs public sentiment + mention volume on each tool's `/[slug]` page. Building a second ingest stack would be wasteful: **`high-signal` already runs the ingest engine** (Modal cron, edgartools/Trafilatura/GLiNER/FinBERT, Reddit + news + GitHub + IR + GDELT, signal generator, Hono/D1 API). The constraint that overrides everything: high-signal is the engine; EverythingRated is a consumer. The hard problem is that high-signal's locked wedge is **AI infra / semiconductors** (~274 entities), and AI dev tools (Cursor, Claude Code, Aider, Windsurf, etc.) are not in that wedge — so EverythingRated cannot just call the existing `/entities` endpoint and find what it needs.

## Architecture decision — pick **B**: multi-collection engine

**Picked: Option B — multi-collection engine.** Add a `collection` field to `entities` in `packages/db` (default `ai_infra`, plus a new `ai_dev_tools`). Keep one Hono API, one D1, one Modal cron, one Python ingest. high-signal's public web (`apps/web`) filters to `collection = ai_infra` so its narrative stays clean. EverythingRated subscribes to `collection = ai_dev_tools`. Source adapters and the entity gazetteer get a per-collection scoping argument; everything else (extract, score, generator, writer, scoreRuns) is collection-agnostic. The seed adds `python/ingest/src/high_signal_ingest/seed/ai_dev_tools_entities.csv` and routing config so Reddit/HN/news adapters know which subs/feeds belong to which collection.

**Rationale.** Option A (just dump dev tools into the existing 274-entity list) pollutes high-signal's "AI infra alpha" public surface — a dev-tool launch sentiment signal would land in the same digest as a TSMC capex call. Option C (extract a `signal-engine` package) is the correct end-state but is a multi-week refactor before any third consumer exists; YAGNI applies. Option B is the smallest move that solves the brand pollution problem cleanly while preserving the option to do C later — when a 3rd wedge appears, the `collection` column already partitions the data and graduating to a workspace package is mostly file movement.

**Rejected and why.**
- **A:** trivially cheap, but high-signal's whole positioning is "AI infra hit-rate ledger"; mixing in dev-tool praise/complaint signals dilutes that and confuses both the public RSS and the calibration math (forward returns don't apply to private dev-tool startups in the same way).
- **C:** strictly better long-term but requires moving `python/ingest`, `packages/db`, the Hono routes, and the seed loaders into a shared workspace, plus republishing types. Not justified by one consumer.

**Next 2 concrete steps.**
1. Add `collection: text("collection").notNull().default("ai_infra")` to `entities` in `/Users/sarthakagrawal/Desktop/fleet/high-signal/packages/db/src/schema.ts` and write a migration. Update `seed/__init__.py` `load_entities()` to accept a `collection` arg and read from a per-collection CSV.
2. Add a Hono route `GET /entities?collection=ai_dev_tools` in `workers/api/src/routes/entities.ts` (already accepts `sector` query — extend to accept `collection`).

## API contract — what EverythingRated calls

EverythingRated calls Hono at `https://api.high-signal.<host>` (or whatever the `workers/api` URL becomes). All endpoints already exist or are tiny extensions of existing ones.

### `GET /entities?collection=ai_dev_tools`

Returns the list EverythingRated matches its `items` against on slug-load (cached nightly).

```ts
type EntityListResponse = {
  entities: Array<{
    id: string;          // e.g. "CURSOR"
    slug: string;        // "cursor" — NEW field, the shared key
    name: string;        // "Cursor"
    ticker: string | null;
    type: "public" | "private" | "sector" | "product";
    country: string | null;
    sector: string | null;
    collection: string;  // "ai_dev_tools"
    aliases: string[];   // surfaced from metadata json
  }>;
};
```

### `GET /entities/:id/signals?since=<iso>&until=<iso>`

Time-bucketed daily aggregates across all events tied to the entity. New endpoint — small, sits next to the existing `/entities/:id`.

```ts
type EntitySignalsResponse = {
  entityId: string;
  windowStart: string;   // ISO
  windowEnd: string;     // ISO
  buckets: Array<{
    date: string;        // YYYY-MM-DD
    mentions: number;
    sentiment: {
      positive: number;
      negative: number;
      neutral: number;
      net: number;       // (pos - neg) / total, in [-1, 1]
    };
    bySource: Record<string, number>; // {"reddit:cursor": 12, "news:hn": 4}
    byIntent: Record<IntentLabel, number>;
  }>;
  totals: {
    mentions: number;
    netSentiment: number;
  };
};
```

### `GET /entities/:id/mentions?since=<iso>&until=<iso>&limit=50`

Raw mentions for the "what people are saying" panel. Backed by the existing `events` table joined with the new per-event sentiment + intent fields (see "diff inside high-signal").

```ts
type EntityMentionsResponse = {
  entityId: string;
  mentions: Array<{
    id: string;
    source: string;          // "reddit:cursor" | "news:hn" | "news:techcrunch"
    sourceUrl: string;
    title: string | null;
    excerpt: string | null;  // first 280 chars of content
    publishedAt: string;     // ISO
    sentiment: "positive" | "negative" | "neutral";
    sentimentScore: number;  // [-1, 1]
    intent: IntentLabel;
  }>;
  nextCursor: string | null;
};

type IntentLabel =
  | "complaint"
  | "praise"
  | "switching_to"
  | "switching_from"
  | "feature_request"
  | "comparison"
  | "neutral_mention";
```

Auth: `x-er-key` header — a shared secret in EverythingRated's Vercel env, validated by a tiny middleware in `workers/api/src/index.ts`. Public web at `apps/web` does not need this; only the EverythingRated route does, to keep abuse out of the new endpoints.

## Entity resolution

**Shared key: `slug`.** A new `slug` column on `entities` (slugified `name`, e.g. `Cursor` → `cursor`, `Claude Code` → `claude-code`). EverythingRated's `items.slug` is already the same shape. Resolution at request time:

1. EverythingRated server-side `getItemAggregate(slug, ...)` already loads the item.
2. Same `slug` is passed to `fetch('${HIGH_SIGNAL_API}/entities?collection=ai_dev_tools')` (cached, see below) → match on `entities[].slug === item.slug`.
3. If matched, fetch `/entities/${entity.id}/signals` and `/entities/${entity.id}/mentions`. If no match, render the page without the sentiment panel — graceful degradation.

The slug map lives in high-signal's seed CSV (`ai_dev_tools_entities.csv`) and is the source of truth. EverythingRated never invents an entity id; it asks high-signal what exists.

## Composite score

The `/[slug]` page shows three columns side by side: **user rating**, **mention volume**, **sentiment trend**. They are *not* mathematically blended into a single number — that would lie about what each signal means. They are **time-aligned** so the user can scan them as a row.

Time windows are inherited from `0001-time-evolving-ratings.md` — see that plan for the canonical bucket definitions. This plan defers to it; if `0001` defines `7d / 30d / 90d`, this plan uses the same three.

```
overallRating(t) = ratings_avg over window W      // from 0001
mentionVolume(t) = sum of bucket.mentions in W    // from /signals endpoint
netSentiment(t)  = sum(positive - negative) / sum(total) in W  // from /signals
trend(t)         = sign(metric(W_recent) - metric(W_prior))    // up/down/flat arrow
```

Where `W_recent` is the latest window and `W_prior` is the immediately preceding equal-length window. Same arithmetic for all three columns so the visual rhythm is consistent.

## Caching

**ISR with `revalidate = 3600` (1 hour) on the `/[slug]` page, plus a Vercel KV cache layer for the entity-list call.** Reasoning:

- Mention volumes update at most once per Modal cron tick (06:00 UTC daily today, may go to hourly later). Hourly ISR is well below the upstream cadence — we never serve data the engine doesn't have, and never hit the engine more than once per page per hour.
- The `/entities?collection=ai_dev_tools` list is read on every page render but changes only when high-signal seeds a new tool. KV cache it for 24h (`stale-while-revalidate=86400`); hard-bust via webhook from high-signal admin when the seed changes (`POST /api/internal/bust-entities` from a small `workers/api` admin route, optional v2).
- Per-entity signal/mention bundles are cached by the Next.js `fetch` cache with `next: { revalidate: 3600, tags: ['entity-' + id] }`. If high-signal ever adds a webhook on signal publish, EverythingRated calls `revalidateTag('entity-' + id)`.

Rejected: nightly snapshot file (too stale, fights the ratings UX); per-request fetch (hammers high-signal); Cloudflare Workers KV from EverythingRated (cross-domain coupling, EverythingRated is on Vercel/Turso).

## Diff inside high-signal — keep small

1. **Schema**: `packages/db/src/schema.ts` — add to `entities`: `collection: text` (default `"ai_infra"`, indexed), `slug: text` (unique-per-collection, indexed). Add to `events`: `sentimentLabel`, `sentimentScore: real`, `intent: text`. Generate migration `0001_collections_and_event_sentiment.sql`.
2. **Seed loader**: `python/ingest/src/high_signal_ingest/seed/__init__.py` — `load_entities(collection: str = "ai_infra")` reads the matching CSV. New file: `seed/ai_dev_tools_entities.csv` with ~15 rows (Cursor, Claude Code, Windsurf, GitHub Copilot, Aider, Cline, Continue, Codeium, Tabnine, Sourcegraph Cody, plus 5 reserve).
3. **Sources config**: `seed/sources.yaml` — tag each source with `collections: [ai_infra]` or `[ai_dev_tools]` or both. Add new entries: `r/cursor`, `r/ChatGPTCoding`, `r/LocalLLaMA` (already there), `r/ClaudeAI`, HN front page (already in news for ai_infra — extend to dev tools).
4. **Reddit adapter**: `sources/reddit.py` — `DEFAULT_SUBS` becomes `subs_for(collection)`. Pull from `sources.yaml` instead of the hardcoded list.
5. **Pipeline**: `pipeline.py` — accept `--collection ai_dev_tools` flag; the gazetteer is built only from that collection's entities so a "Cursor" mention in r/semiconductors doesn't accidentally tag the wrong wedge.
6. **Sentiment + intent on every event**: `score/sentiment.py` already exists (FinBERT). Add `score/intent.py` — small LLM classifier prompt with the 7-label taxonomy (see below), invoked per event in `pipeline.py` after entity tagging. Persist `sentimentLabel`, `sentimentScore`, `intent` on the event row. **Caveat note in code**: FinBERT is finance-tuned and will be wrong for dev-tool sentiment edges (e.g. "this is sick" in dev-tool slang reads positive in FinBERT only by accident). Defer a domain-tuned classifier until v2.
7. **API**: `workers/api/src/routes/entities.ts` — accept `?collection=`, return new `slug` field. New route `entities/:id/signals` with bucketed aggregates over `events` (group-by-day, count/sentiment/intent). New route `entities/:id/mentions` with paginated raw events.
8. **Auth**: tiny `x-er-key` middleware on the two new routes only.
9. **Public web**: `apps/web` — every `entities` query gains `collection = ai_infra`. Single-line filter, doesn't change UI.

That's it. No new ingest source files. No new classifier model. No schema rewrite of `signals` (signal cards stay AI-infra-only for now; dev-tool wedge gets event-level sentiment + intent without going through the full signal-card pipeline yet).

## Intent taxonomy (lives in high-signal classifier)

This taxonomy is added to high-signal's `score/intent.py` LLM prompt — **not** to EverythingRated.

| Label | Definition | Example |
| - | - | - |
| `praise` | Unprompted positive opinion | "Cursor's tab autocomplete is genuinely magical" |
| `complaint` | Unprompted negative opinion | "Claude Code keeps timing out on my repo" |
| `switching_to` | Author moved to this tool | "Finally migrated from Copilot to Cursor" |
| `switching_from` | Author moved away from this tool | "Dropped Tabnine for Codeium last week" |
| `feature_request` | Asks for / wishes for capability | "Wish Aider had a watch mode" |
| `comparison` | Side-by-side vs another tool | "Cursor vs Windsurf for monorepos" |
| `neutral_mention` | Reference without opinion | "Built it with Cursor" |

The classifier returns the label and a confidence; below 0.5 confidence falls back to `neutral_mention`.

## MVP source pick

From sources high-signal already wires up, the strongest two for AI dev tool sentiment on day one:

1. **Reddit** (`sources/reddit.py`). Add subs to `sources.yaml` with collection `ai_dev_tools`: `r/cursor`, `r/ChatGPTCoding`, `r/ClaudeAI`, `r/LocalLLaMA` (already in default list), `r/programming` (filtered by gazetteer hit). Reddit dominates dev-tool sentiment and the score>=20 gating already filters noise.
2. **Hacker News via the news/RSS adapter** (`sources/news.py`). HN is signal-rich for dev-tool launches and switching narratives. Add `https://hnrss.org/frontpage` and `https://hnrss.org/newest?q=cursor+OR+claude-code+OR+windsurf+OR+aider` (or one query feed per tool — small set, manageable) tagged `collections: [ai_dev_tools]`.

Defer for v2 once these prove out: GitHub releases (already in `sources/github.py`, useful for "shipped X" but lower sentiment density), YouTube (`sources/youtube.py`, expensive transcripts), Twitter/X (out of scope per requirements — high-signal will decide independently).

## Open questions (max 3)

1. **Sentiment model fitness.** FinBERT is finance-tuned. How wrong is it on dev-tool slang? Spot-check 50 r/cursor posts after first ingest; if precision is below ~0.7, swap in a general-purpose model (DistilBERT-SST2) for the dev-tool collection while keeping FinBERT for ai_infra. Decide before launch.
2. **Slug uniqueness across collections.** `cursor` is unambiguous today, but `continue` (the dev tool) could collide with a future entity. Make `slug` unique per `(collection, slug)`, not globally — locked by the migration. Do we surface the collection in the URL on EverythingRated? (Probably not; EverythingRated is single-collection by design.)
3. **Signal cards for dev tools — yes or no?** This plan ships event-level sentiment + intent only. Whether full signal-card generation runs over the dev-tool wedge (with directional predictions and forward-return scoring) is a separate, bigger decision. Returns are not measured the same way for private dev-tool startups; defer.

## Critical files for implementation

- `/Users/sarthakagrawal/Desktop/fleet/high-signal/packages/db/src/schema.ts`
- `/Users/sarthakagrawal/Desktop/fleet/high-signal/workers/api/src/routes/entities.ts`
- `/Users/sarthakagrawal/Desktop/fleet/high-signal/python/ingest/src/high_signal_ingest/seed/__init__.py`
- `/Users/sarthakagrawal/Desktop/fleet/high-signal/python/ingest/src/high_signal_ingest/pipeline.py`
- `/Users/sarthakagrawal/Desktop/fleet/everythingrated/apps/web/src/app/[slug]/page.tsx`
