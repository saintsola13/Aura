"use client";

import { api, mediaSrc } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "./social/session-provider";

const baseLinks = [
  { href: "/home", label: "Home", icon: "⌂" }, { href: "/explore", label: "Explore", icon: "⌕" },
  { href: "/compose", label: "Compose", icon: "+" }, { href: "/notifications", label: "Notifications", icon: "◌" },
];

export function DevUserSwitcher() {
  const { users, user, selectUser, loading } = useSession();
  return (
    <label className="block rounded-xl border border-amber-300/15 bg-amber-300/[.045] p-3">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[.16em] text-amber-200/70">Development session</span>
      <select value={user?.id ?? ""} onChange={(event) => selectUser(event.target.value)} disabled={loading} aria-label="Select development user" className="w-full bg-transparent text-sm text-zinc-300 outline-none">
        {!users.length && <option value="">Seed local D1 first</option>}
        {users.map((item) => <option key={item.id} value={item.id} className="bg-zinc-900">{item.displayName} (@{item.username})</option>)}
      </select>
      <span className="mt-2 block text-[10px] leading-4 text-zinc-600">Temporary local identity. Not secure authentication.</span>
    </label>
  );
}

export function SiteHeader() {
  const path = usePathname(); const { user } = useSession(); const [unread, setUnread] = useState(0);
  useEffect(() => { if (user) api<{ unreadCount: number }>("/v1/notifications?limit=1").then((data) => setUnread(data.unreadCount)).catch(() => setUnread(0)); }, [user, path]);
  const links = [...baseLinks, { href: user ? `/profile/${user.username}` : "/settings", label: "Profile", icon: "○" }];
  const active = (href: string) => path === href || (href.startsWith("/profile/") && path.startsWith("/profile/"));
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[.07] bg-[#070708]/95 px-5 py-6 backdrop-blur-xl lg:flex">
        <Link href="/home" className="mb-9 flex items-center gap-3 px-2" aria-label="AURA home"><span className="logo-mark"/><span className="text-sm font-semibold tracking-[.22em]">AURA</span></Link>
        <nav className="space-y-1" aria-label="Primary navigation">
          {links.map((link) => <Link key={link.label} href={link.href} className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${active(link.href)?"bg-white/[.08] text-white":"text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200"}`} aria-current={active(link.href)?"page":undefined}><span className="w-5 text-center text-lg" aria-hidden="true">{link.icon}</span>{link.label}{link.label==="Notifications"&&unread>0&&<span className="ml-auto rounded-full bg-violet-500 px-2 py-0.5 text-[10px] text-white">{unread>99?"99+":unread}</span>}</Link>)}
        </nav>
        <div className="mt-auto space-y-2"><DevUserSwitcher/><div className="flex gap-4 px-3 pt-3 text-xs text-zinc-600"><Link href="/settings" className="hover:text-white">Settings</Link><Link href="/white-paper" className="hover:text-white">WP</Link></div></div>
      </aside>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[.07] bg-[#070708]/80 px-4 backdrop-blur-xl lg:ml-64 lg:hidden">
        <Link href="/home" className="flex items-center gap-2"><span className="logo-mark"/><span className="text-xs font-semibold tracking-[.2em]">AURA</span></Link>
        <Link href="/settings" className="text-xs text-zinc-500">Settings</Link>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/[.08] bg-[#09090b]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        {links.map((link)=><Link key={link.label} href={link.href} className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] ${active(link.href)?"text-white":"text-zinc-600"}`} aria-label={link.label} aria-current={active(link.href)?"page":undefined}><span className="text-lg">{link.icon}</span>{link.label}{link.label==="Notifications"&&unread>0&&<span className="absolute right-[28%] top-2.5 h-2 w-2 rounded-full bg-violet-400"/>}</Link>)}
      </nav>
    </>
  );
}

export function SocialShell({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return <main className="min-h-screen pb-20 lg:ml-64 lg:pb-0"><SiteHeader/><div className="mx-auto grid max-w-6xl grid-cols-1 xl:grid-cols-[minmax(0,680px)_300px]"><div className="min-w-0 border-x border-white/[.06] xl:border-l-0">{children}</div>{aside&&<aside className="hidden p-6 xl:block">{aside}</aside>}</div></main>;
}

export function SiteFooter() { return <footer className="mx-auto flex max-w-3xl gap-5 border-t border-white/[.07] px-6 py-10 text-xs text-zinc-600"><Link href="/settings">Settings</Link><Link href="/white-paper">White Paper</Link></footer>; }

export function Avatar({ user, size="md" }: { user: {avatarUrl:string|null;displayName:string}; size?:"sm"|"md"|"lg" }) {
  const cls=size==="lg"?"h-24 w-24 text-2xl":size==="sm"?"h-9 w-9 text-xs":"h-11 w-11 text-sm";
  return user.avatarUrl?<img src={mediaSrc(user.avatarUrl)??""} alt="" className={`${cls} rounded-full border border-white/10 object-cover`}/>:<span className={`${cls} grid shrink-0 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/10 font-medium text-violet-100`}>{user.displayName.slice(0,1).toUpperCase()}</span>;
}
