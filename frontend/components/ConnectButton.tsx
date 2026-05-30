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
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400" />
      <span className="text-sm text-slate-600 font-mono hidden sm:block">{address.slice(0, 8)}...{address.slice(-6)}</span>
      <button onClick={disconnect} className="text-xs text-slate-400 hover:text-slate-700">Disconnect</button>
    </div>
  );

  return (
    <button onClick={open} className="text-sm font-medium px-4 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50">
      Connect Wallet
    </button>
  );
}
