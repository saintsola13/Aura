import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  const styles = variant === "primary"
    ? "bg-white text-black hover:bg-zinc-200 shadow-[0_0_40px_rgba(255,255,255,.14)]"
    : "border border-white/10 bg-white/[.04] text-white hover:bg-white/[.08]";

  return (
    <button
      className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
