import { WalletButton } from "@/components/wallet-button";

const features = [
  { number: "01", title: "One identity", copy: "A portable profile anchored to your wallet, ready wherever you go." },
  { number: "02", title: "Private by design", copy: "You choose what becomes public. Your identity stays in your control." },
  { number: "03", title: "Built for speed", copy: "A global edge network keeps every interaction quiet, fluid, and fast." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <a href="#" className="flex items-center gap-3" aria-label="AURA home">
          <span className="logo-mark" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-[.22em]">AURA</span>
        </a>
        <div className="hidden items-center gap-8 text-sm text-zinc-400 sm:flex">
          <a className="transition hover:text-white" href="#features">Product</a>
          <a className="transition hover:text-white" href="#principles">Principles</a>
        </div>
        <WalletButton />
      </nav>

      <section className="relative mx-auto flex min-h-[760px] max-w-7xl flex-col items-center justify-center px-6 pb-28 pt-20 text-center lg:px-8">
        <div className="orb" aria-hidden="true" />
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-xs text-zinc-400 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_12px_#a78bfa]" />
            Your identity, beautifully yours
          </div>
          <h1 className="mx-auto max-w-5xl text-balance text-6xl font-medium leading-[.95] tracking-[-.065em] sm:text-7xl lg:text-[7.5rem]">
            Own your digital<br /><span className="text-gradient">presence.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-balance text-base leading-7 text-zinc-400 sm:text-lg">
            AURA is a calm, trusted home for your onchain identity—designed around you, not the platform.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <WalletButton />
            <a href="#features" className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm text-zinc-300 transition hover:text-white">
              Explore AURA <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-28 lg:px-8">
        <div className="mb-16 max-w-2xl">
          <p className="mb-4 text-xs font-medium uppercase tracking-[.24em] text-violet-300">The foundation</p>
          <h2 className="text-balance text-4xl font-medium tracking-[-.04em] sm:text-5xl">Identity that feels like it belongs to you.</h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-3xl border border-white/[.08] bg-white/[.08] md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.number} className="group min-h-72 bg-[#0a0a0c] p-8 transition hover:bg-[#0d0c12] sm:p-10">
              <span className="text-xs text-zinc-600">{feature.number}</span>
              <div className="mt-20 h-px w-8 bg-violet-400/50 transition-all duration-500 group-hover:w-16" />
              <h3 className="mt-6 text-xl font-medium">{feature.title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-zinc-500">{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="principles" className="mx-auto max-w-7xl px-6 py-28 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/[.08] bg-white/[.025] px-8 py-24 text-center sm:px-16">
          <div className="subtle-glow" aria-hidden="true" />
          <p className="relative text-xs uppercase tracking-[.24em] text-zinc-500">A quieter internet starts here</p>
          <h2 className="relative mx-auto mt-6 max-w-3xl text-balance text-4xl font-medium tracking-[-.04em] sm:text-6xl">Human at the center.<br />Technology in the background.</h2>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/[.07] px-6 py-10 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <span>© {new Date().getFullYear()} AURA</span>
        <span>Built at the edge. Owned by you.</span>
      </footer>
    </main>
  );
}
