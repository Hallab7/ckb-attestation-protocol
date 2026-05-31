"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AttestationCard } from "@/components/AttestationCard";
import { getSchema, getAttestationsBySchema } from "@/lib/indexer";
import { Schema, Attestation } from "@/lib/types";

export default function SchemaDetailPage({ params }: { params: Promise<{ schemaId: string }> }) {
  const { schemaId } = use(params);
  const id = decodeURIComponent(schemaId);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSchema(id), getAttestationsBySchema(id)])
      .then(([schemaData, attestationData]) => {
        setSchema(schemaData);
        setAttestations(attestationData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link href="/schemas" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)]">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to schemas
      </Link>

      {loading ? (
        <div className="surface space-y-4 p-6">
          <div className="h-10 w-1/2 animate-pulse rounded-full bg-[var(--surface-strong)]" />
          <div className="h-4 w-full animate-pulse rounded-full bg-[var(--surface-strong)]" />
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-[var(--surface-strong)]" />
        </div>
      ) : !schema ? (
        <div className="surface p-6">
          <p className="text-sm text-[var(--muted)]">Schema not found or still loading.</p>
          <p className="mt-3 break-all font-mono text-xs text-[var(--muted)]">{id}</p>
        </div>
      ) : (
        <>
          <div className="surface p-6 md:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]">
                <span className="font-display text-2xl font-semibold">{schema.name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <p className="page-kicker">Schema detail</p>
                <h1 className="section-title mt-2">{schema.name}</h1>
                <p className="body-copy mt-4">{schema.description}</p>
              </div>
            </div>

            {schema.fields.length > 0 && (
              <div className="mb-6">
                <p className="caption-label mb-3">Fields</p>
                <div className="space-y-2">
                  {schema.fields.map((field) => (
                    <div key={field.name} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm">
                      <span className="font-mono font-medium">{field.name}</span>
                      <span className="text-[var(--muted)]">{field.type}</span>
                      {field.required && <span className="status-pill">Required</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-2">
              <div>
                <p className="caption-label">Attester</p>
                <p className="mt-2 truncate font-mono text-xs text-[var(--muted)]">{schema.attesterAddress}</p>
              </div>
              <div>
                <p className="caption-label">Schema ID</p>
                <p className="mt-2 truncate font-mono text-xs text-[var(--muted)]">{schema.schemaId}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/issue/${schema.schemaId}`} className="btn-primary">
                Issue attestation
              </Link>
              <a
                href={`https://testnet.explorer.nervos.org/transaction/${schema.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                View on explorer
              </a>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="section-title">Attestations</h2>
              <span className="caption-label">({attestations.length})</span>
            </div>

            {attestations.length === 0 ? (
              <div className="surface py-16 text-center text-[var(--muted)]">
                <p className="text-sm">No attestations issued yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {attestations.map((attestation) => (
                  <AttestationCard key={attestation.attestationId} attestation={attestation} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
