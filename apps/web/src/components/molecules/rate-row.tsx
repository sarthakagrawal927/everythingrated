"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { ScoreBar } from "@/components/atoms/score-bar";
import type { AspectAverage } from "@/lib/ratings";
import { submitRating } from "@/lib/actions";

/**
 * Interactive rating row — 5 buttons, optimistic update, calls a Server Action.
 * Re-rating is permitted (server upserts on the unique constraint).
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

  function pick(score: number) {
    // Optimistic average update: if first rating, becomes the score; otherwise
    // recalc using running mean.
    const prev = your;
    const nextCount = prev === null ? optimisticCount + 1 : optimisticCount;
    const sumBefore = optimisticAvg * optimisticCount - (prev ?? 0);
    const nextAvg = nextCount === 0 ? 0 : (sumBefore + score) / nextCount;
    setYour(score);
    setOptimisticAvg(nextAvg);
    setOptimisticCount(nextCount);
    startTransition(async () => {
      await submitRating({
        directorySlug,
        itemSlug,
        itemId,
        aspectId: initial.aspect.id,
        score,
      });
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
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={pending}
            onClick={() => pick(n)}
            aria-label={`Rate ${n}`}
            aria-pressed={your === n}
            className={cn(
              "h-8 w-8 rounded-[var(--radius-sm)] border text-sm font-medium transition-colors",
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
    </div>
  );
}
