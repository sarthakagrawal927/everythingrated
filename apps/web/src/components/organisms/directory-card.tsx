import Link from "next/link";
import { Card, CardBody } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import type { DirectorySummary } from "@/lib/ratings";

export function DirectoryCard({ data }: { data: DirectorySummary }) {
  const { directory, itemCount, aspectCount } = data;
  return (
    <Link href={`/d/${directory.slug}`} className="group block">
      <Card className="h-full transition-colors group-hover:border-[var(--border-strong)]">
        <CardBody className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-semibold tracking-tight">
                {directory.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-[12px] text-[var(--muted)]">
                {directory.description}
              </p>
            </div>
          </div>

          <p className="text-[13px] leading-[1.55] text-[var(--muted)]">
            {directory.heroCopy}
          </p>

          <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3">
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{itemCount} items</Badge>
              <Badge tone="outline">{aspectCount} aspects</Badge>
            </div>
            <span className="text-[12px] text-[var(--muted)] group-hover:text-[var(--foreground)]">
              Explore →
            </span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
