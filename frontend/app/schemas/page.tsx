"use client";

import { useEffect, useMemo, useState } from "react";
import { useCcc } from "@ckb-ccc/connector-react";
import { SchemaCard } from "@/components/SchemaCard";
import { getAllSchemas, getMySchemas } from "@/lib/indexer";
import { Schema } from "@/lib/types";

export default function SchemasPage() {
  const { signerInfo } = useCcc();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [all, mine] = await Promise.all([
          getAllSchemas(200),
          signerInfo?.signer ? getMySchemas(signerInfo.signer) : Promise.resolve([]),
        ]);
        const myIds = new Set(mine.map((schema) => schema.schemaId.toLowerCase()));
        const ordered = [...mine, ...all.filter((schema) => !myIds.has(schema.schemaId.toLowerCase()))];
        setSchemas(ordered);
      } catch {
        setSchemas([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [signerInfo]);

  const filtered = useMemo(
    () =>
      schemas.filter(
        (schema) =>
          !search ||
          schema.name.toLowerCase().includes(search.toLowerCase()) ||
          schema.description.toLowerCase().includes(search.toLowerCase())
      ),
    [schemas, search]
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="page-kicker">Registry</p>
        <h1 className="section-title max-w-2xl">Attestation schemas</h1>
        <p className="body-copy max-w-2xl">
          Browse the current registry, filter by keyword, and jump straight into a schema detail or issue flow.
        </p>
      </section>

      <section className="surface p-4 md:p-6">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search schemas by name or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
          />
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="surface p-5">
              <div className="mb-4 h-10 w-10 animate-pulse rounded-full border border-[var(--border)] bg-[var(--surface)]" />
              <div className="mb-2 h-4 w-3/4 animate-pulse rounded-full bg-[var(--surface-strong)]" />
              <div className="h-3 w-full animate-pulse rounded-full bg-[var(--surface-strong)]" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface py-16 text-center text-[var(--muted)]">
          <p className="text-sm">{search ? "No results found." : "No schemas available yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((schema) => (
            <SchemaCard key={schema.schemaId} schema={schema} />
          ))}
        </div>
      )}
    </div>
  );
}
