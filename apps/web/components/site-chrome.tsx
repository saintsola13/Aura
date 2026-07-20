import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-white/[.07]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 lg:px-8" aria-label="Primary navigation">
        <Link href="/" className="flex items-center gap-3" aria-label="AURA home">
          <span className="logo-mark" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-[.22em]">AURA</span>
        </Link>
        <div className="flex items-center gap-5 text-sm text-zinc-400 sm:gap-7">
          <Link className="transition hover:text-white" href="/settings">Settings</Link>
          <Link className="transition hover:text-white" href="/white-paper">WP</Link>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-5xl flex-col gap-4 border-t border-white/[.07] px-6 py-10 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <span>© {new Date().getFullYear()} AURA</span>
      <div className="flex items-center gap-5">
        <Link className="transition hover:text-zinc-300" href="/settings">Settings</Link>
        <Link className="transition hover:text-zinc-300" href="/white-paper">White Paper</Link>
      </div>
    </footer>
  );
}
