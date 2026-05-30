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
      .then(([s, a]) => { setSchema(s); setAttestations(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/schemas" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Schemas
      </Link>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-slate-100 rounded w-1/2" />
          <div className="h-4 bg-slate-100 rounded w-full" />
        </div>
      ) : !schema ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-slate-500 text-sm mb-2">Schema not found or still loading.</p>
          <p className="text-xs font-mono text-slate-400 break-all">{id}</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <span className="text-violet-600 text-xl font-bold">{schema.name.charAt(0)}</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 mb-1">{schema.name}</h1>
                <p className="text-slate-500 text-sm">{schema.description}</p>
              </div>
            </div>

            {/* Fields */}
            {schema.fields.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fields</p>
                <div className="space-y-1">
                  {schema.fields.map((f) => (
                    <div key={f.name} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-slate-700 font-medium">{f.name}</span>
                      <span className="text-slate-400">{f.type}</span>
                      {f.required && <span className="text-red-500">required</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400 mb-1">Attester</p>
                <p className="text-xs font-mono text-slate-700 truncate">{schema.attesterAddress}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Schema ID</p>
                <p className="text-xs font-mono text-slate-700 truncate">{schema.schemaId}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link href={`/issue/${schema.schemaId}`}
                className="text-sm font-medium px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                Issue Attestation
              </Link>
              <a href={`https://testnet.explorer.nervos.org/transaction/${schema.txHash}`}
                target="_blank" rel="noopener noreferrer"
                className="text-sm font-medium px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:border-slate-300">
                View on Explorer
              </a>
            </div>
          </div>

          <h2 className="font-semibold text-slate-900 mb-4">
            Attestations <span className="text-slate-400 font-normal">({attestations.length})</span>
          </h2>
          {attestations.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
              <p className="text-sm">No attestations issued yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attestations.map((a) => <AttestationCard key={a.attestationId} attestation={a} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
