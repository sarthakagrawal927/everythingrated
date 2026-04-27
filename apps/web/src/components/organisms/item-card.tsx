import Link from "next/link";
import { Card, CardBody } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { AspectRow } from "@/components/molecules/aspect-row";
import type { ItemWithAggregate } from "@/lib/ratings";

export function ItemCard({
  data,
  directorySlug,
}: {
  data: ItemWithAggregate;
  directorySlug: string;
}) {
  return (
    <Link href={`/d/${directorySlug}/${data.item.slug}`} className="group block">
      <Card className="h-full transition-colors group-hover:border-[var(--border-strong)]">
        <CardBody className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-semibold tracking-tight">
                {data.item.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-[12px] text-[var(--muted)]">
                {data.item.description}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="num text-2xl font-semibold tabular-nums">
                {data.overall > 0 ? data.overall.toFixed(1) : "—"}
              </span>
              <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--muted-2)]">
                Overall / 5
              </span>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-1.5 border-t border-[var(--border)] pt-3">
            {data.aspects.map((a) => (
              <AspectRow key={a.aspect.id} a={a} />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Badge tone="neutral">{data.totalRaters} rater{data.totalRaters === 1 ? "" : "s"}</Badge>
            <span className="text-[12px] text-[var(--muted)] group-hover:text-[var(--foreground)]">
              Rate this →
            </span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
