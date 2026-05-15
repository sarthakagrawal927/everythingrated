import Link from "next/link";

export const metadata = { title: "Not found — EverythingRated" };

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="font-mono text-[12px] uppercase tracking-wide text-[var(--muted)]">
        404
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Not found</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        That directory or item doesn&apos;t exist (yet).
      </p>
      <div className="mt-6 flex justify-center gap-4 text-sm">
        <Link href="/" className="underline">
          All directories
        </Link>
        <Link href="/api-docs" className="underline">
          API
        </Link>
      </div>
    </main>
  );
}
