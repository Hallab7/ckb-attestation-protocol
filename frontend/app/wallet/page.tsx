"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCcc } from "@ckb-ccc/connector-react";
import { AttestationCard } from "@/components/AttestationCard";
import { SchemaCard } from "@/components/SchemaCard";
import { getMyReceivedAttestations, getMyIssuedAttestations, getMySchemas } from "@/lib/indexer";
import { revokeAttestation } from "@/lib/transactions";
import { Attestation, Schema } from "@/lib/types";

const TABS = [
  { id: "received", label: "Received" },
  { id: "issued", label: "Issued by me" },
  { id: "schemas", label: "My schemas" },
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
    ])
      .then(([receivedData, issuedData, schemaData]) => {
        setReceived(receivedData);
        setIssued(issuedData);
        setSchemas(schemaData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [signerInfo]);

  async function handleRevoke(attestationId: string) {
    if (!signerInfo?.signer) return;
    if (!confirm("Revoke this attestation?")) return;

    setRevokingId(attestationId);
    setTxError(null);
    try {
      await revokeAttestation(signerInfo.signer, attestationId);
      setIssued((current) => current.filter((attestation) => attestation.attestationId !== attestationId));
    } catch (error: any) {
      setTxError(error?.message ?? "Failed");
    } finally {
      setRevokingId(null);
    }
  }

  if (!signerInfo?.signer) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="surface px-6 py-16">
          <p className="page-kicker">Wallet</p>
          <h1 className="section-title mt-3">Connect your wallet to view attestations.</h1>
          <p className="body-copy mx-auto mt-4 max-w-xl">Once connected, your received items, issued records, and schemas appear here.</p>
          <button onClick={open} className="btn-primary mt-8">
            Connect wallet
          </button>
        </div>
      </div>
    );
  }

  const counts = {
    received: received.length,
    issued: issued.length,
    schemas: schemas.length,
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="page-kicker">Wallet workspace</p>
        <h1 className="section-title">My wallet</h1>
        <p className="body-copy">Review attestations you received, issued, or control through your schemas.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Received", value: received.length },
          { label: "Issued", value: issued.length },
          { label: "Schemas", value: schemas.length },
        ].map((item) => (
          <div key={item.label} className="metric-card">
            <p className="metric-value">{item.value.toString().padStart(2, "0")}</p>
            <p className="mt-2 text-sm font-semibold">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              tab === item.id
                ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
                : "border-[var(--border)] bg-transparent text-[var(--muted)]"
            }`}
          >
            {item.label} <span className="ml-1 text-xs opacity-70">({counts[item.id as keyof typeof counts]})</span>
          </button>
        ))}
      </section>

      {txError && <div className="surface px-4 py-3 text-sm text-[var(--muted)]">{txError}</div>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="surface p-5">
              <div className="mb-4 h-10 w-10 animate-pulse rounded-full border border-[var(--border)] bg-[var(--surface)]" />
              <div className="mb-2 h-4 w-3/4 animate-pulse rounded-full bg-[var(--surface-strong)]" />
              <div className="h-3 w-full animate-pulse rounded-full bg-[var(--surface-strong)]" />
            </div>
          ))}
        </div>
      ) : tab === "received" ? (
        received.length === 0 ? (
          <Empty msg="No attestations received yet." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {received.map((attestation) => (
              <AttestationCard key={attestation.attestationId} attestation={attestation} />
            ))}
          </div>
        )
      ) : tab === "issued" ? (
        issued.length === 0 ? (
          <Empty msg="No attestations issued yet." link={{ href: "/issue", label: "Issue one >" }} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {issued.map((attestation) => (
              <AttestationCard
                key={attestation.attestationId}
                attestation={attestation}
                showRevoke
                revoking={revokingId === attestation.attestationId}
                onRevoke={() => handleRevoke(attestation.attestationId)}
              />
            ))}
          </div>
        )
      ) : schemas.length === 0 ? (
        <Empty msg="No schemas created yet." link={{ href: "/issue", label: "Create one >" }} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {schemas.map((schema) => (
            <SchemaCard key={schema.schemaId} schema={schema} actionHref={`/issue/${schema.schemaId}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ msg, link }: { msg: string; link?: { href: string; label: string } }) {
  return (
    <div className="surface py-16 text-center text-[var(--muted)]">
      <p className="text-sm">{msg}</p>
      {link && (
        <Link href={link.href} className="mt-3 inline-flex text-xs uppercase tracking-[0.16em] text-[var(--text)]">
          {link.label}
        </Link>
      )}
    </div>
  );
}
