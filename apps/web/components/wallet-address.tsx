"use client";

import { isEthereumAddress, normalizeWalletAddress } from "@aura/shared";
import { Button } from "@aura/ui";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

const STORAGE_KEY = "aura.public-wallet-address";
const ADDRESS_EVENT = "aura:wallet-address-change";

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

function readStoredAddress(): string {
  const value = localStorage.getItem(STORAGE_KEY) ?? "";
  return isEthereumAddress(value) ? normalizeWalletAddress(value) : "";
}

export function WalletAddress() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setAddress(readStoredAddress());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(ADDRESS_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ADDRESS_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
    };
  }, [open]);

  function showEntry() {
    setDraft(address);
    setError("");
    setOpen(true);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = draft.trim();
    if (!isEthereumAddress(candidate)) {
      setError("Enter 0x followed by exactly 40 hexadecimal characters.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, normalizeWalletAddress(candidate));
    window.dispatchEvent(new Event(ADDRESS_EVENT));
    setOpen(false);
  }

  function remove() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(ADDRESS_EVENT));
    setDraft("");
    setError("");
    setOpen(false);
  }

  return (
    <>
      <Button onClick={showEntry} aria-haspopup="dialog" aria-expanded={open}>
        {address ? shortAddress(address) : "Enter wallet"}
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
          <button
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
            onClick={() => setOpen(false)}
            aria-label="Close wallet address dialog"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${inputId}-title`}
            className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0c0c0f] p-6 text-left shadow-[0_32px_100px_rgba(0,0,0,.7)] sm:p-8"
          >
            <div className="address-dialog-glow" aria-hidden="true" />
            <div className="relative">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[.2em] text-violet-300">Public address only</p>
                  <h2 id={`${inputId}-title`} className="text-2xl font-medium tracking-[-.035em]">
                    {address ? "Manage wallet" : "Enter your wallet"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-lg text-zinc-500 transition hover:bg-white/[.06] hover:text-white"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <p className="mb-5 text-sm leading-6 text-zinc-400">
                Paste a public Ethereum address to identify your profile. AURA never connects to your wallet or requests access.
              </p>

              <form onSubmit={save} noValidate>
                <label htmlFor={inputId} className="mb-2 block text-xs font-medium text-zinc-300">Ethereum address</label>
                <input
                  ref={inputRef}
                  id={inputId}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="0x0000000000000000000000000000000000000000"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={Boolean(error)}
                  aria-describedby={`${inputId}-help`}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 font-mono text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10 aria-[invalid=true]:border-red-400/60"
                />
                <div id={`${inputId}-help`} className={`mt-2 min-h-5 text-xs ${error ? "text-red-300" : "text-zinc-600"}`} aria-live="polite">
                  {error || "40 hexadecimal characters, beginning with 0x."}
                </div>

                <div className="mt-5 flex gap-3">
                  <Button type="submit" className="flex-1">{address ? "Save changes" : "Save address"}</Button>
                  {address && <Button type="button" variant="secondary" onClick={remove}>Remove</Button>}
                </div>
              </form>

              <div className="mt-5 flex items-start gap-2.5 border-t border-white/[.07] pt-5 text-xs leading-5 text-zinc-600">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80" />
                No wallet permissions, private keys, seed phrases, signatures, or transactions—ever.
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
