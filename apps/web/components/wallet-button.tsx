"use client";

import { Button } from "@aura/ui";
import { useEffect, useState } from "react";

type EthereumProvider = {
  request(args: { method: string }): Promise<unknown>;
  on?(event: string, listener: (accounts: string[]) => void): void;
  removeListener?(event: string, listener: (accounts: string[]) => void): void;
};

declare global { interface Window { ethereum?: EthereumProvider } }

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function WalletButton() {
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    const update = (accounts: string[]) => setAddress(accounts[0] ?? "");
    provider.request({ method: "eth_accounts" }).then((result) => update(result as string[])).catch(() => undefined);
    provider.on?.("accountsChanged", update);
    return () => provider.removeListener?.("accountsChanged", update);
  }, []);

  async function connect() {
    if (!window.ethereum) {
      window.open("https://ethereum.org/wallets/", "_blank", "noopener,noreferrer");
      return;
    }
    setPending(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      setAddress(accounts[0] ?? "");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={connect} disabled={pending} aria-label={address ? `Connected as ${address}` : "Connect wallet"}>
      {pending ? "Connecting…" : address ? shortAddress(address) : "Connect wallet"}
    </Button>
  );
}
