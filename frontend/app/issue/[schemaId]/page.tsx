"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useCcc } from "@ckb-ccc/connector-react";
import { getSchema } from "@/lib/indexer";
import { issueAttestation } from "@/lib/transactions";
import { Schema } from "@/lib/types";

interface IssuedResult { recipient: string; txHash: string; attestationId: string; }

export default function IssueAttestationPage({ params }: { params: Promise<{ schemaId: string }> }) {
  const { schemaId } = use(params);
  const id = decodeURIComponent(schemaId);
  const { open, signerInfo } = useCcc();
  const [schema, setSchema] = useState<Schema | null>(null);
  const [myAddress, setMyAddress] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<IssuedResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSchema(id).then(setSchema).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!signerInfo?.signer) { setMyAddress(null); return; }
    signerInfo.signer.getRecommendedAddress().then(setMyAddress).catch(() => setMyAddress(null));
  }, [signerInfo]);

  // Pre-fill issuer field if schema has one
  useEffect(() => {
    if (schema?.fields.some((f) => f.name === "issuer") && myAddress) {
      setFieldValues((v) => ({ ...v, issuer: v.issuer || "CKB Attester" }));
    }
  }, [schema, myAddress]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signerInfo?.signer) { open(); return; }
    setSubmitting(true); setError(null);
    try {
      const data: Record<string, string | number | boolean> = {};
      schema?.fields.forEach((f) => {
        const val = fieldValues[f.name] ?? "";
        data[f.name] = f.type === "number" ? Number(val) : f.type === "boolean" ? val === "true" : val;
      });
      // Always include name from schema
      if (!data.name) data.name = schema?.name ?? "Attestation";

      const res = await issueAttestation(signerInfo.signer, id, recipient, data);
      setResults((r) => [...r, { recipient, ...res }]);
      setRecipient("");
    } catch (e: any) { setError(e?.message ?? "Transaction failed"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link href="/issue" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back
      </Link>

      {schema && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
            {schema.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-900">{schema.name}</p>
            <p className="text-xs text-violet-600">{schema.description}</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Issue Attestation</h1>
        <p className="text-sm text-slate-500">Attest a CKB address. The attestation cell will be owned by the recipient.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        {/* Recipient */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Address</label>
          <div className="relative">
            <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)}
              placeholder="ckt1..." className="w-full px-3 py-2 pr-24 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-mono" required />
            {myAddress && (
              <button type="button" onClick={() => setRecipient(myAddress)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200">
                Use mine
              </button>
            )}
          </div>
        </div>

        {/* Schema fields */}
        {schema?.fields.map((f) => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {f.name} <span className="text-slate-400 font-normal text-xs">({f.type})</span>
              {f.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {f.type === "boolean" ? (
              <select value={fieldValues[f.name] ?? "false"} onChange={(e) => setFieldValues((v) => ({ ...v, [f.name]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400">
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            ) : (
              <input type={f.type === "number" ? "number" : "text"}
                value={fieldValues[f.name] ?? ""}
                onChange={(e) => setFieldValues((v) => ({ ...v, [f.name]: e.target.value }))}
                placeholder={`Enter ${f.name}`}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                required={f.required} />
            )}
          </div>
        ))}

        {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{error}</div>}

        <button type="submit" disabled={!recipient.trim() || submitting}
          className="w-full bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed">
          {submitting ? "Issuing..." : !signerInfo?.signer ? "Connect Wallet" : "Issue Attestation"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-slate-900 mb-3">Issued ({results.length})</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-xs text-emerald-700 font-mono truncate mb-1">→ {r.recipient}</p>
                <a href={`https://testnet.explorer.nervos.org/transaction/${r.txHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-emerald-600 underline">View transaction</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
