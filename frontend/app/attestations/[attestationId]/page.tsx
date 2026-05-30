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
  const [myAddress, setMyAddress] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [resultTx, setResultTx] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  useEffect(() => {
    getAttestation(id).then((a) => {
      setAttestation(a);
      if (a?.schemaId) getSchema(a.schemaId).then(setSchema).catch(() => {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!signerInfo?.signer) { setMyAddress(null); return; }
    signerInfo.signer.getRecommendedAddress().then(setMyAddress).catch(() => setMyAddress(null));
  }, [signerInfo]);

  async function handleRevoke() {
    if (!signerInfo?.signer) { open(); return; }
    if (!confirm("Revoke this attestation? This cannot be undone.")) return;
    setRevoking(true); setTxError(null);
    try {
      const hash = await revokeAttestation(signerInfo.signer, id);
      setResultTx(hash);
    } catch (e: any) { setTxError(e?.message ?? "Transaction failed"); }
    finally { setRevoking(false); }
  }

  const isAttester = myAddress && attestation &&
    attestation.attesterLockHash.toLowerCase().includes(myAddress.slice(0, 10).toLowerCase());

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/wallet" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back
      </Link>

      {resultTx && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          Transaction sent!{" "}
          <a href={`https://testnet.explorer.nervos.org/transaction/${resultTx}`} target="_blank" rel="noopener noreferrer" className="underline font-mono text-xs">{resultTx.slice(0, 20)}...</a>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-slate-100 mb-4" />
          <div className="h-6 bg-slate-100 rounded w-1/2 mb-3" />
          <div className="h-4 bg-slate-100 rounded w-full" />
        </div>
      ) : !attestation ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-slate-500 text-sm">Attestation not found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold text-slate-900">{String(attestation.data.name ?? "Attestation")}</h1>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Verified</span>
              </div>
              {schema && <p className="text-sm text-slate-500">Schema: <Link href={`/schemas/${schema.schemaId}`} className="text-violet-600 hover:underline">{schema.name}</Link></p>}
              <p className="text-xs text-slate-400 mt-0.5">Block #{attestation.issuedAt.toString()}</p>
            </div>
          </div>

          {/* Attested data */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Attested Data</p>
            <div className="space-y-2">
              {Object.entries(attestation.data).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-900 font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* On-chain info */}
          <div className="space-y-2 pt-4 border-t border-slate-100 mb-4">
            {[
              { label: "Subject", value: attestation.subjectAddress },
              { label: "Attester Hash", value: attestation.attesterLockHash },
              { label: "Attestation ID", value: attestation.attestationId },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-400 shrink-0">{label}</span>
                <span className="text-xs font-mono text-slate-700 truncate">{value.slice(0, 20)}...{value.slice(-8)}</span>
              </div>
            ))}
          </div>

          {txError && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{txError}</div>}

          <div className="flex gap-2">
            <a href={`https://testnet.explorer.nervos.org/transaction/${attestation.txHash}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center text-sm font-medium py-2 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300">
              View on Explorer
            </a>
            {isAttester && (
              <button onClick={handleRevoke} disabled={revoking}
                className="flex-1 text-sm font-medium py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40">
                {revoking ? "Revoking..." : "Revoke Attestation"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
