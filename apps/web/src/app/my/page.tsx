import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardBody } from "@/components/atoms/card";
import { RankedCollectionsPanel } from "@/components/organisms/ranked-collections-panel";
import type { RatedItemRef } from "@/lib/collections";
import { listItemsRatedByVisitor } from "@/lib/ratings";
import { readVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My ratings — EverythingRated",
  description: "Things you've rated on this browser, newest first.",
};

export default async function MyRatingsPage() {
  const visitorId = await readVisitorId();
  if (!visitorId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]">
          ← All directories
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">My ratings</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Rate something — we&apos;ll mint your anonymous cookie and start
          tracking your history here. Nothing is sent server-side beyond
          that opaque id.
        </p>
      </main>
    );
  }

  const items = await listItemsRatedByVisitor(visitorId);
  const ratedItems: RatedItemRef[] = items.map((entry) => ({
    itemId: entry.item.id,
    itemName: entry.item.name,
    itemSlug: entry.item.slug,
    directorySlug: entry.directory.slug,
    directoryName: entry.directory.name,
    yourMean: entry.yourMean,
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]">
        ← All directories
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">My ratings</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {items.length === 0
          ? "Nothing rated on this browser yet."
          : `${items.length} item${items.length === 1 ? "" : "s"}, newest first.`}
      </p>

      {items.length > 0 && (
        <ol className="mt-6 divide-y divide-[var(--border)]">
          {items.map((entry) => (
            <li key={entry.item.id} className="flex items-center gap-4 py-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/d/${entry.directory.slug}/${entry.item.slug}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {entry.item.name}
                </Link>
                <Link
                  href={`/d/${entry.directory.slug}`}
                  className="text-xs text-[var(--muted)] hover:underline"
                >
                  {entry.directory.name}
                </Link>
              </div>
              <div className="text-right text-xs tabular-nums">
                <div className="font-medium">
                  {entry.yourMean.toFixed(1)}/5
                </div>
                <div className="text-[var(--muted)]">
                  {entry.ratedAspects} axis{entry.ratedAspects === 1 ? "" : "es"}
                </div>
                <div className="text-[var(--muted)]">
                  {entry.lastRatedAt.toISOString().slice(0, 10)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {items.length === 0 && (
        <Card className="mt-6">
          <CardBody>
            <p className="text-sm text-[var(--muted)]">
              Head over to a{" "}
              <Link href="/" className="underline">
                directory
              </Link>{" "}
              and rate a few items. They&apos;ll appear here on next visit.
            </p>
          </CardBody>
        </Card>
      )}

      <RankedCollectionsPanel ratedItems={ratedItems} />
    </main>
  );
}
