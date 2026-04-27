import Link from "next/link";
import { notFound } from "next/navigation";
import { getDirectoryBySlug, listItemsWithAggregates } from "@/lib/ratings";
import { readVisitorId } from "@/lib/visitor";
import { ItemCard } from "@/components/organisms/item-card";
import { Badge } from "@/components/atoms/badge";

export const dynamic = "force-dynamic";

export default async function DirectoryPage({
  params,
}: {
  params: Promise<{ directory: string }>;
}) {
  const { directory: dirSlug } = await params;
  const directory = await getDirectoryBySlug(dirSlug);
  if (!directory) notFound();

  const visitorId = await readVisitorId();
  const items = await listItemsWithAggregates(directory.id, visitorId);

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute inset-0 dot-grid" aria-hidden />
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-12 pt-10 md:pb-16 md:pt-16">
          <Link
            href="/"
            className="text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← All directories
          </Link>
          <Badge tone="outline" className="mb-4 mt-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--foreground)]" />
            Directory
          </Badge>
          <h1 className="text-balance text-[36px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[52px]">
            {directory.name}
          </h1>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.55] text-[var(--muted)]">
            {directory.heroCopy}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-[20px] font-semibold tracking-tight">{directory.name}</h2>
          <span className="text-[12px] text-[var(--muted)]">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-10 text-center text-[var(--muted)]">
            No items in this directory yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <ItemCard key={it.item.id} data={it} directorySlug={directory.slug} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
