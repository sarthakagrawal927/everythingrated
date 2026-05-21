import { listDirectories } from "@/lib/ratings";
import { DirectoryCard } from "@/components/organisms/directory-card";
import { Badge } from "@/components/atoms/badge";

export const dynamic = "force-dynamic";

const features = [
  {
    title: "Axes that fit the category",
    body: "Each directory defines its own aspects. An AI editor is rated on different dimensions than a database — because the trade-offs are different.",
  },
  {
    title: "One number per axis",
    body: "Every aspect gets its own average, plus an overall score across aspects. The detail stays visible instead of collapsing into one star.",
  },
  {
    title: "Anonymous, no account",
    body: "Rate without signing up. A cookie ties your ratings together so you can come back and update them — your latest rating counts.",
  },
];

const steps = [
  {
    n: "1",
    title: "Pick a directory",
    body: "Browse the categories below — each is a bucket of comparable tools.",
  },
  {
    n: "2",
    title: "Open an item",
    body: "See the per-aspect averages and how many people have rated it.",
  },
  {
    n: "3",
    title: "Rate the axes",
    body: "Give each aspect a 1–5. Your scores update the averages instantly.",
  },
];

export default async function LandingPage() {
  const directories = await listDirectories();

  return (
    <>
      {/* Hero */}
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
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#directories"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-[var(--foreground)] px-5 text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-90"
            >
              Browse directories
            </a>
            <a
              href="/submit-directory"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
            >
              Submit a directory
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <h2 className="text-[20px] font-semibold tracking-tight">
          Why multi-axis
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <h3 className="text-sm font-medium text-[var(--foreground)]">
                {f.title}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[var(--muted)]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--border)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <h2 className="text-[20px] font-semibold tracking-tight">
            How it works
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.n}
                className="rounded-[var(--radius-md)] border border-[var(--border)] p-5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-sm font-semibold">
                  {s.n}
                </div>
                <h3 className="mt-3 text-sm font-medium">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-[var(--muted)]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Directories */}
      <section
        id="directories"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-14"
      >
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
