"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useCcc } from "@ckb-ccc/connector-react";
import { getAttestation, getSchema } from "@/lib/indexer";
import { revokeAttestation } from "@/lib/transactions";
import { Attestation, Schema } from "@/lib/types";

export default function AttestationDetailPage({ params }: { params: Promise<{ attestationId: string }> }) {
  const { attestationId } = use(params);
  const id = decodeURIComponent(attestationId);
  const { open, signerInfo } = useCcc();
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState(true);
  const [myLockHash, setMyLockHash] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [resultTx, setResultTx] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  useEffect(() => {
    getAttestation(id)
      .then((current) => {
        setAttestation(current);
        if (current?.schemaId) {
          getSchema(current.schemaId).then(setSchema).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!signerInfo?.signer) {
      setMyLockHash(null);
      return;
    }
    signerInfo.signer
      .getRecommendedAddressObj()
      .then((addr) => setMyLockHash(addr.script.hash().toLowerCase()))
      .catch(() => setMyLockHash(null));
  }, [signerInfo]);

  async function handleRevoke() {
    if (!signerInfo?.signer) {
      open();
      return;
    }
    if (!confirm("Revoke this attestation? This cannot be undone.")) return;

    setRevoking(true);
    setTxError(null);
    try {
      const hash = await revokeAttestation(signerInfo.signer, id);
      setResultTx(hash);
    } catch (error: any) {
      setTxError(error?.message ?? "Transaction failed");
    } finally {
      setRevoking(false);
    }
  }

  const isAttester = Boolean(
    myLockHash &&
      attestation &&
      attestation.attesterLockHash.toLowerCase() === myLockHash
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/wallet" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)]">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {resultTx && (
        <div className="surface px-4 py-3 text-sm">
          Transaction sent!
          <a
            href={`https://testnet.explorer.nervos.org/transaction/${resultTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)] hover:text-[var(--text)]"
          >
            {resultTx.slice(0, 20)}...
          </a>
        </div>
      )}

      {loading ? (
        <div className="surface space-y-4 p-6">
          <div className="h-14 w-14 animate-pulse rounded-full border border-[var(--border)] bg-[var(--surface)]" />
          <div className="h-6 w-1/2 animate-pulse rounded-full bg-[var(--surface-strong)]" />
          <div className="h-4 w-full animate-pulse rounded-full bg-[var(--surface-strong)]" />
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-[var(--surface-strong)]" />
        </div>
      ) : !attestation ? (
        <div className="surface p-6">
          <p className="text-sm text-[var(--muted)]">Attestation not found.</p>
        </div>
      ) : (
        <div className="surface p-6 md:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="section-title">{String(attestation.data.name ?? "Attestation")}</h1>
                <span className="status-pill">Verified</span>
              </div>
              {schema && (
                <p className="text-sm text-[var(--muted)]">
                  Schema:{" "}
                  <Link href={`/schemas/${schema.schemaId}`} className="text-[var(--text)] underline decoration-[var(--border-strong)] underline-offset-4">
                    {schema.name}
                  </Link>
                </p>
              )}
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Block #{attestation.issuedAt.toString()}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="caption-label mb-3">Attested data</p>
            <div className="space-y-2">
              {Object.entries(attestation.data).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm">
                  <span className="text-[var(--muted)]">{key}</span>
                  <span className="text-right font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 space-y-2 border-t border-[var(--border)] pt-4">
            {[
              { label: "Subject", value: attestation.subjectAddress },
              { label: "Attester hash", value: attestation.attesterLockHash },
              { label: "Attestation ID", value: attestation.attestationId },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4">
                <span className="caption-label">{item.label}</span>
                <span className="truncate font-mono text-xs text-[var(--muted)]">
                  {item.value.slice(0, 20)}...{item.value.slice(-8)}
                </span>
              </div>
            ))}
          </div>

          {txError && <div className="surface mb-4 px-4 py-3 text-sm text-[var(--muted)]">{txError}</div>}

          <div className="flex flex-col gap-3 md:flex-row">
            <a
              href={`https://testnet.explorer.nervos.org/transaction/${attestation.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex-1"
            >
              View on explorer
            </a>
            {isAttester && (
              <button onClick={handleRevoke} disabled={revoking} className="btn-primary flex-1 disabled:opacity-40">
                {revoking ? "Revoking..." : "Revoke attestation"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
