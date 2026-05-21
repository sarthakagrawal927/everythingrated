"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { ScoreBar } from "@/components/atoms/score-bar";
import type { AspectAverage } from "@/lib/ratings";
import { submitRating } from "@/lib/actions";
import { markVisitorActivity } from "@/lib/analytics";
import { captureActionFailure } from "@/lib/foundry-monitoring";

/**
 * Interactive rating row — 5 buttons, optimistic update, calls a Server Action.
 * Re-rating is permitted (server upserts on the unique constraint).
 * On failure the optimistic state is rolled back and a retry is offered.
 */
export function RateRow({
  itemId,
  itemSlug,
  directorySlug,
  initial,
}: {
  itemId: string;
  itemSlug: string;
  directorySlug: string;
  initial: AspectAverage;
}) {
  const [your, setYour] = useState<number | null>(initial.yourScore);
  const [optimisticAvg, setOptimisticAvg] = useState(initial.avg);
  const [optimisticCount, setOptimisticCount] = useState(initial.count);
  const [pending, startTransition] = useTransition();
  const [failedScore, setFailedScore] = useState<number | null>(null);

  function pick(score: number) {
    setFailedScore(null);
    // Snapshot for rollback if the Server Action fails.
    const prev = your;
    const prevAvg = optimisticAvg;
    const prevCount = optimisticCount;
    // Optimistic average update: if first rating, becomes the score; otherwise
    // recalc using running mean.
    const nextCount = prev === null ? optimisticCount + 1 : optimisticCount;
    const sumBefore = optimisticAvg * optimisticCount - (prev ?? 0);
    const nextAvg = nextCount === 0 ? 0 : (sumBefore + score) / nextCount;
    setYour(score);
    setOptimisticAvg(nextAvg);
    setOptimisticCount(nextCount);
    startTransition(async () => {
      try {
        await submitRating({
          directorySlug,
          itemSlug,
          itemId,
          aspectId: initial.aspect.id,
          score,
        });
        // Analytics — mark prior activity so a future session emits `returned`.
        markVisitorActivity();
      } catch (error) {
        // Roll back the optimistic update and surface a retry.
        console.error("submitRating failed", error);
        captureActionFailure(error, { action: "submit_rating" });
        setYour(prev);
        setOptimisticAvg(prevAvg);
        setOptimisticCount(prevCount);
        setFailedScore(score);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-2 border-b border-[var(--border)] py-4 last:border-b-0 sm:grid-cols-[12rem_1fr_auto] sm:items-center sm:gap-4">
      <div>
        <div className="text-sm font-medium text-[var(--foreground)]">
          {initial.aspect.label}
        </div>
        <div className="text-[11px] text-[var(--muted)]">
          {initial.aspect.description}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ScoreBar value={optimisticAvg} className="flex-1" />
        <span className="num w-10 shrink-0 text-right text-sm tabular-nums">
          {optimisticCount > 0 ? optimisticAvg.toFixed(1) : "—"}
        </span>
      </div>
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={pending}
              onClick={() => pick(n)}
              aria-label={`Rate ${n}`}
              aria-pressed={your === n}
              className={cn(
                // 44px touch target on mobile (WCAG 2.5.5 / iOS HIG),
                // compact 32px on >=sm where a pointer is likely.
                "h-11 w-11 sm:h-8 sm:w-8 rounded-[var(--radius-sm)] border text-sm font-medium transition-colors",
                your === n
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--border-strong)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                pending && "opacity-60",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        {failedScore !== null ? (
          <p
            role="status"
            className="text-[11px] text-[var(--muted)]"
          >
            Couldn&apos;t save that rating.{" "}
            <button
              type="button"
              onClick={() => pick(failedScore)}
              className="underline underline-offset-2 hover:text-[var(--foreground)]"
            >
              Retry
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
