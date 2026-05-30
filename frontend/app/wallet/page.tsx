"use client";
import { useEffect, useState } from "react";
import { useCcc } from "@ckb-ccc/connector-react";
import { AttestationCard } from "@/components/AttestationCard";
import { SchemaCard } from "@/components/SchemaCard";
import { getMyReceivedAttestations, getMyIssuedAttestations, getMySchemas } from "@/lib/indexer";
import { revokeAttestation } from "@/lib/transactions";
import { Attestation, Schema } from "@/lib/types";
import Link from "next/link";

const TABS = [
  { id: "received", label: "Received" },
  { id: "issued", label: "Issued by me" },
  { id: "schemas", label: "My Schemas" },
];

export default function WalletPage() {
  const { open, signerInfo } = useCcc();
  const [tab, setTab] = useState("received");
  const [received, setReceived] = useState<Attestation[]>([]);
  const [issued, setIssued] = useState<Attestation[]>([]);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  useEffect(() => {
    if (!signerInfo?.signer) return;
    setLoading(true);
    Promise.all([
      getMyReceivedAttestations(signerInfo.signer),
      getMyIssuedAttestations(signerInfo.signer),
      getMySchemas(signerInfo.signer),
    ]).then(([r, i, s]) => { setReceived(r); setIssued(i); setSchemas(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [signerInfo]);

  async function handleRevoke(attestationId: string) {
    if (!signerInfo?.signer) return;
    if (!confirm("Revoke this attestation?")) return;
    setRevokingId(attestationId); setTxError(null);
    try {
      await revokeAttestation(signerInfo.signer, attestationId);
      setIssued((a) => a.filter((x) => x.attestationId !== attestationId));
    } catch (e: any) { setTxError(e?.message ?? "Failed"); }
    finally { setRevokingId(null); }
  }

  if (!signerInfo?.signer) return (
    <div className="text-center py-24">
      <p className="text-slate-500 text-sm mb-4">Connect your wallet to view your attestations.</p>
      <button onClick={open} className="bg-violet-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-violet-700">
        Connect Wallet
      </button>
    </div>
  );

  const tabData = { received, issued, schemas };
  const counts = { received: received.length, issued: issued.length, schemas: schemas.length };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">My Wallet</h1>
        <p className="text-sm text-slate-500">Your attestations and schemas.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Received", value: received.length },
          { label: "Issued", value: issued.length },
          { label: "Schemas", value: schemas.length },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-2xl font-semibold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-6">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t.label} <span className="text-slate-400 text-xs ml-1">({counts[t.id as keyof typeof counts]})</span>
          </button>
        ))}
      </div>

      {txError && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{txError}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-slate-100 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : tab === "received" ? (
        received.length === 0 ? (
          <Empty msg="No attestations received yet." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {received.map((a) => <AttestationCard key={a.attestationId} attestation={a} />)}
          </div>
        )
      ) : tab === "issued" ? (
        issued.length === 0 ? (
          <Empty msg="No attestations issued yet." link={{ href: "/issue", label: "Issue one →" }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {issued.map((a) => (
              <AttestationCard key={a.attestationId} attestation={a} showRevoke
                revoking={revokingId === a.attestationId}
                onRevoke={() => handleRevoke(a.attestationId)} />
            ))}
          </div>
        )
      ) : (
        schemas.length === 0 ? (
          <Empty msg="No schemas created yet." link={{ href: "/issue", label: "Create one →" }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schemas.map((s) => <SchemaCard key={s.schemaId} schema={s} actionHref={`/issue/${s.schemaId}`} />)}
          </div>
        )
      )}
    </div>
  );
}

function Empty({ msg, link }: { msg: string; link?: { href: string; label: string } }) {
  return (
    <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-xl">
      <p className="text-sm mb-2">{msg}</p>
      {link && <Link href={link.href} className="text-violet-600 text-sm hover:underline">{link.label}</Link>}
    </div>
  );
}
