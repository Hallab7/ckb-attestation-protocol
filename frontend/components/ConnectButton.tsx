"use client";
import { useCcc } from "@ckb-ccc/connector-react";
import { useEffect, useState } from "react";

export function ConnectButton() {
  const { open, disconnect, signerInfo } = useCcc();
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!signerInfo?.signer) { setAddress(null); return; }
    signerInfo.signer.getRecommendedAddress().then(setAddress).catch(() => setAddress(null));
  }, [signerInfo]);

  if (address) return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--text)" }} />
      <span className="hidden font-mono text-xs text-[var(--muted)] sm:block">
        {address.slice(0, 8)}...{address.slice(-6)}
      </span>
      <button type="button" onClick={disconnect} className="btn-ghost px-0 py-0 text-[11px] uppercase tracking-[0.14em]">
        Disconnect
      </button>
    </div>
  );

  return (
    <button onClick={open} className="btn-primary">
      Connect Wallet
    </button>
  );
}
