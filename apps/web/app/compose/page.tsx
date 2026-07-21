"use client";
import { SocialShell } from"@/components/site-chrome";import{Composer}from"@/components/social/composer";import{useRouter}from"next/navigation";
export default function ComposePage(){const router=useRouter();return <SocialShell><header className="border-b border-white/[.07] px-5 py-4"><h1 className="font-medium">Compose</h1></header><Composer onPosted={post=>router.push(`/post/${post.id}`)}/><div className="p-6 text-xs leading-5 text-zinc-600">Posts are plain text, never rendered as HTML. One JPEG, PNG, or WebP image up to 8 MB can be attached.</div></SocialShell>}
