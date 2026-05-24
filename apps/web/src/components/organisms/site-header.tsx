import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_85%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <LogoMark />
          <span>EverythingRated</span>
        </Link>
        <nav className="flex items-center gap-4 text-[12px] text-[var(--muted)]">
          <Link href="/my" className="hover:text-[var(--foreground)]">
            My ratings
          </Link>
          <Link href="/submit-directory" className="hover:text-[var(--foreground)]">
            Submit directory
          </Link>
          <span className="hidden md:block">Multi-axis ratings</span>
        </nav>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--foreground)] text-[var(--background)]"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
        <path
          d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
