"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCcc } from "@ckb-ccc/connector-react";
import { SchemaCard } from "@/components/SchemaCard";
import { getAllSchemas, getMySchemas } from "@/lib/indexer";
import { Schema } from "@/lib/types";

export default function Home() {
  const { signerInfo } = useCcc();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [all, mine] = await Promise.all([
          getAllSchemas(50),
          signerInfo?.signer ? getMySchemas(signerInfo.signer) : Promise.resolve([]),
        ]);
        const myIds = new Set(mine.map((s) => s.schemaId.toLowerCase()));
        const others = all.filter((s) => !myIds.has(s.schemaId.toLowerCase()));
        setSchemas([...mine, ...others].slice(0, 6));
      } catch { setSchemas([]); }
      finally { setLoading(false); }
    }
    load();
  }, [signerInfo]);

  return (
    <div>
      {/* Hero */}
      <div className="text-center py-16 mb-12">
        <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-violet-200">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          On-chain attestations on CKB
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Verifiable On-chain Attestations</h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto mb-8">
          Define schemas, issue attestations to any address, and revoke them. Each attestation is a cell owned by the subject — verifiable by anyone.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/issue" className="bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-violet-700">
            Issue Attestation
          </Link>
          <Link href="/verify" className="bg-white text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-lg border border-slate-300 hover:border-slate-400">
            Verify an Address
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {[
          { step: "1", title: "Define a Schema", desc: "Create an attestation schema on-chain. Schemas define the fields and structure of your attestations." },
          { step: "2", title: "Issue Attestations", desc: "Attest any CKB address. The attestation cell is owned by the subject — not you." },
          { step: "3", title: "Verify & Revoke", desc: "Anyone can verify attestations by reading cells. Attesters can revoke at any time." },
        ].map((item) => (
          <div key={item.step} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white text-sm font-bold flex items-center justify-center mb-3">{item.step}</div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1">{item.title}</h3>
            <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent schemas */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Recent Schemas</h2>
        <Link href="/schemas" className="text-sm text-violet-600 hover:text-violet-800">View all →</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-slate-100 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : schemas.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
          <p className="text-sm mb-2">No schemas yet.</p>
          <Link href="/issue" className="text-violet-600 text-sm hover:underline">Create the first one →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemas.map((s) => <SchemaCard key={s.schemaId} schema={s} />)}
        </div>
      )}
    </div>
  );
}
