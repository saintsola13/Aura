import { SiteFooter } from "@/components/site-chrome";
import Link from "next/link";
export const LEGAL_DRAFT_NOTICE =
  "Initial operational draft — requires review by qualified legal counsel before public launch.";
export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { title: string; body: string }[];
}) {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-7">
        <Link href="/" className="flex items-center gap-3">
          <span className="logo-mark" />
          <span className="text-xs tracking-[.22em]">AURA</span>
        </Link>
        <Link href="/settings" className="text-xs text-zinc-500">
          Policies
        </Link>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs uppercase tracking-[.2em] text-violet-300">
          Legal & safety
        </p>
        <h1 className="mt-5 text-5xl tracking-[-.055em]">{title}</h1>
        <p className="mt-4 text-sm text-zinc-600">Updated {updated}</p>
        <p className="mt-8 rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-4 text-sm text-amber-100/70">
          {LEGAL_DRAFT_NOTICE}
        </p>
        <div className="mt-14 space-y-12">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl">{s.title}</h2>
              <p className="mt-4 whitespace-pre-line leading-7 text-zinc-400">
                {s.body}
              </p>
            </section>
          ))}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
