import Link from "next/link";
import { notFound } from "next/navigation";
import { getItemAggregate } from "@/lib/ratings";
import { readVisitorId } from "@/lib/visitor";
import { Badge } from "@/components/atoms/badge";
import { RateRow } from "@/components/molecules/rate-row";

export const dynamic = "force-dynamic";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ directory: string; item: string }>;
}) {
  const { directory: dirSlug, item: itemSlug } = await params;
  const visitorId = await readVisitorId();
  const result = await getItemAggregate(dirSlug, itemSlug, visitorId);
  if (!result) notFound();
  const { directory, data } = result;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
        <Link href="/" className="hover:text-[var(--foreground)]">
          All directories
        </Link>
        <span>/</span>
        <Link href={`/d/${directory.slug}`} className="hover:text-[var(--foreground)]">
          {directory.name}
        </Link>
      </div>

      <header className="mt-6 flex flex-col items-start justify-between gap-6 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[36px] font-semibold tracking-tight">
            {data.item.name}
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-[var(--muted)]">
            {data.item.description}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <a
              href={data.item.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
            >
              {new URL(data.item.websiteUrl).hostname} ↗
            </a>
            <Badge tone="neutral">
              {data.totalRaters} rater{data.totalRaters === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="num text-5xl font-semibold tabular-nums">
            {data.overall > 0 ? data.overall.toFixed(1) : "—"}
          </span>
          <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--muted-2)]">
            Overall / 5
          </span>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-[12px] uppercase tracking-[0.1em] text-[var(--muted)]">
          Rate across aspects
        </h2>
        <p className="mt-1 text-[12px] text-[var(--muted-2)]">
          One rating per aspect per visitor — change anytime, your latest counts.
        </p>
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-5">
          {data.aspects.map((a) => (
            <RateRow
              key={a.aspect.id}
              itemId={data.item.id}
              itemSlug={data.item.slug}
              directorySlug={directory.slug}
              initial={a}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
