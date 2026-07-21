"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function CheckEmailPage() {
  const [masked, setMasked] = useState("your email address");
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    setMasked(
      sessionStorage.getItem("aura.login.masked") ?? "your email address",
    );
    const t = setInterval(() => setSeconds((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="max-w-md text-center">
        <span className="logo-mark mx-auto block" />
        <h1 className="mt-8 text-4xl tracking-[-.05em]">Check your email</h1>
        <p className="mt-4 leading-7 text-zinc-400">
          We sent a secure sign-in link to{" "}
          <span className="text-white">{masked}</span>. It expires in 15
          minutes.
        </p>
        <p className="mt-8 text-sm text-zinc-600">
          {seconds
            ? `You can request another link in ${seconds}s.`
            : "You can return to login to request another link."}
        </p>
        <div className="mt-7 flex justify-center gap-5 text-sm">
          <Link href="/login" className="text-violet-300">
            Change email
          </Link>
          {seconds === 0 && <Link href="/login">Request another link</Link>}
        </div>
      </section>
    </main>
  );
}
