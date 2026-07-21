"use client";
import Script from "next/script";
import { useEffect, useRef } from "react";
declare global {
  interface Window {
    turnstile?: {
      render(node: HTMLElement, options: Record<string, unknown>): string;
      remove(id: string): void;
    };
  }
}
export function Turnstile({
  action,
  onToken,
}: {
  action: string;
  onToken: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const render = () => {
    if (ref.current && window.turnstile && !widget.current)
      widget.current = window.turnstile.render(ref.current, {
        sitekey:
          process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
          "1x00000000000000000000AA",
        action,
        theme: "dark",
        callback: onToken,
        "expired-callback": () => onToken(""),
      });
  };
  useEffect(
    () => () => {
      if (widget.current) window.turnstile?.remove(widget.current);
    },
    [],
  );
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={render}
      />
      <div ref={ref} className="min-h-[65px]" aria-label="Security check" />
    </>
  );
}
