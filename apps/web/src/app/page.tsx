import { listDirectories } from "@/lib/ratings";
import { DirectoryCard } from "@/components/organisms/directory-card";
import { Badge } from "@/components/atoms/badge";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const directories = await listDirectories();

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute inset-0 dot-grid" aria-hidden />
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-14 md:pb-24 md:pt-24">
          <Badge tone="outline" className="mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--foreground)]" />
            {directories.length} {directories.length === 1 ? "directory" : "directories"}
          </Badge>
          <h1 className="text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[64px]">
            Multi-axis ratings
            <br />
            <span className="text-[var(--muted)]">for the things devs use.</span>
          </h1>
          <p className="mt-6 max-w-[52ch] text-[16px] leading-[1.55] text-[var(--muted)]">
            One stars-out-of-five hides everything that matters. EverythingRated
            scores every tool across the axes that actually decide the
            trade-off — pick a directory and dig in.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-[20px] font-semibold tracking-tight">Directories</h2>
        </div>

        {directories.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-10 text-center text-[var(--muted)]">
            No directories yet. Run{" "}
            <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5">
              pnpm db:seed:local
            </code>{" "}
            to load the starter set.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {directories.map((d) => (
              <DirectoryCard key={d.directory.id} data={d} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
