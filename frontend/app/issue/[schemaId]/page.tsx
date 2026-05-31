"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useCcc } from "@ckb-ccc/connector-react";
import { getSchema } from "@/lib/indexer";
import { issueAttestation } from "@/lib/transactions";
import { Schema } from "@/lib/types";

interface IssuedResult {
  recipient: string;
  txHash: string;
  attestationId: string;
}

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
    if (!signerInfo?.signer) {
      setMyAddress(null);
      return;
    }
    signerInfo.signer.getRecommendedAddress().then(setMyAddress).catch(() => setMyAddress(null));
  }, [signerInfo]);

  useEffect(() => {
    if (schema?.fields.some((field) => field.name === "issuer") && myAddress) {
      setFieldValues((current) => ({ ...current, issuer: current.issuer || "CKB Attester" }));
    }
  }, [schema, myAddress]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signerInfo?.signer) {
      open();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data: Record<string, string | number | boolean> = {};
      schema?.fields.forEach((field) => {
        const value = fieldValues[field.name] ?? "";
        data[field.name] = field.type === "number" ? Number(value) : field.type === "boolean" ? value === "true" : value;
      });

      if (!data.name) data.name = schema?.name ?? "Attestation";

      const result = await issueAttestation(signerInfo.signer, id, recipient, data);
      setResults((current) => [...current, { recipient, ...result }]);
      setRecipient("");
    } catch (err: any) {
      setError(err?.message ?? "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href="/issue" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)]">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {schema && (
        <div className="surface p-4">
          <p className="page-kicker">Selected schema</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]">
              <span className="font-display text-lg font-semibold">{schema.name.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{schema.name}</p>
              <p className="truncate text-xs text-[var(--muted)]">{schema.description}</p>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <p className="page-kicker">Issuance</p>
        <h1 className="section-title">Issue an attestation</h1>
        <p className="body-copy">Issue a claim against a CKB address while keeping the form aligned to the schema definition.</p>
      </section>

      <form onSubmit={handleSubmit} className="surface space-y-5 p-5 md:p-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Recipient address</label>
          <div className="relative">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="ckt1..."
              className="input-field pr-24 font-mono"
              required
            />
            {myAddress && (
              <button
                type="button"
                onClick={() => setRecipient(myAddress)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]"
              >
                Use mine
              </button>
            )}
          </div>
        </div>

        {schema?.fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium">
              {field.name} <span className="text-xs text-[var(--muted)]">({field.type})</span>
              {field.required && <span className="ml-1 text-xs text-[var(--text)]">*</span>}
            </label>
            {field.type === "boolean" ? (
              <select
                value={fieldValues[field.name] ?? "false"}
                onChange={(e) => setFieldValues((current) => ({ ...current, [field.name]: e.target.value }))}
                className="input-field"
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                value={fieldValues[field.name] ?? ""}
                onChange={(e) => setFieldValues((current) => ({ ...current, [field.name]: e.target.value }))}
                placeholder={`Enter ${field.name}`}
                className="input-field"
                required={field.required}
              />
            )}
          </div>
        ))}

        {error && <div className="surface px-4 py-3 text-sm text-[var(--muted)]">{error}</div>}

        <button type="submit" disabled={!recipient.trim() || submitting} className="btn-primary w-full rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed">
          {submitting ? "Issuing..." : !signerInfo?.signer ? "Connect wallet" : "Issue attestation"}
        </button>
      </form>

      {results.length > 0 && (
        <section className="space-y-4">
          <h2 className="section-title">Issued</h2>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="surface p-4">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">To {result.recipient}</p>
                <a
                  href={`https://testnet.explorer.nervos.org/transaction/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-xs uppercase tracking-[0.16em] text-[var(--text)] hover:text-[var(--muted)]"
                >
                  View transaction {">"}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
