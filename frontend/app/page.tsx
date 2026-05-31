"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCcc } from "@ckb-ccc/connector-react";
import { SchemaCard } from "@/components/SchemaCard";
import { getAllSchemas, getMySchemas } from "@/lib/indexer";
import { Schema } from "@/lib/types";

type DashboardMetrics = {
  schemasIndexed: number;
  uniqueIssuers: number;
  totalFields: number;
  mySchemas: number;
};

export default function Home() {
  const { signerInfo } = useCcc();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [mySchemas, setMySchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [all, mine] = await Promise.all([
          getAllSchemas(24),
          signerInfo?.signer ? getMySchemas(signerInfo.signer) : Promise.resolve([]),
        ]);
        const myIds = new Set(mine.map((schema) => schema.schemaId.toLowerCase()));
        const ordered = [...mine, ...all.filter((schema) => !myIds.has(schema.schemaId.toLowerCase()))];
        setSchemas(ordered);
        setMySchemas(mine);
      } catch {
        setSchemas([]);
        setMySchemas([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [signerInfo]);

  const metrics = useMemo<DashboardMetrics>(() => {
    const uniqueIssuers = new Set(schemas.map((schema) => schema.attesterAddress.toLowerCase())).size;
    const totalFields = schemas.reduce((sum, schema) => sum + schema.fields.length, 0);

    return {
      schemasIndexed: schemas.length,
      uniqueIssuers,
      totalFields,
      mySchemas: mySchemas.length,
    };
  }, [schemas, mySchemas]);

  const recent = schemas.slice(0, 6);

  return (
    <div className="space-y-20">
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="space-y-8">
          <div className="space-y-4">
            <span className="page-kicker">Announcement</span>
            <div className="surface inline-flex max-w-full items-center gap-3 px-4 py-3">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--text)" }} />
              <p className="text-sm text-[var(--muted)]">
                Verifiable attestations, issued and audited on CKB with an editorial-grade interface.
              </p>
              <Link href="/schemas" className="hidden text-xs uppercase tracking-[0.16em] text-[var(--text)] sm:inline">
                Explore {">"}
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <p className="page-kicker">AttestCKB / editorial dashboard</p>
            <h1 className="hero-title max-w-4xl">A minimal ledger for claims that need to be trusted.</h1>
            <p className="body-copy max-w-2xl">
              Define schemas, issue attestations to any address, and verify or revoke them from a clean, institutional workspace.
              The interface is designed to feel more like a financial publication than a crypto dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/issue" className="btn-primary">
              Issue attestation
            </Link>
            <Link href="/verify" className="btn-secondary">
              Verify an address
            </Link>
            <Link href="/wallet" className="btn-ghost">
              Open wallet view {">"}
            </Link>
          </div>
        </div>

        <div className="surface-strong p-5 md:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="caption-label">Live snapshot</p>
              <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]">Registry overview</p>
            </div>
            <span className="status-pill">Updated live</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Schemas indexed", value: metrics.schemasIndexed.toString() },
              { label: "Unique issuers", value: metrics.uniqueIssuers.toString() },
              { label: "Total fields", value: metrics.totalFields.toString() },
              { label: "My schemas", value: metrics.mySchemas.toString() || "0" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <p className="caption-label">{item.label}</p>
                <p className="metric-value mt-3">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="caption-label">Recent activity</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {loading ? "Loading" : "Current"}
              </span>
            </div>
            <div className="space-y-3">
              {loading
                ? [0, 1, 2].map((index) => (
                    <div key={index} className="h-14 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
                  ))
                : recent.slice(0, 3).map((schema) => (
                    <div key={schema.schemaId} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{schema.name}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{schema.fields.length} fields / {schema.description}</p>
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        {schema.schemaId.slice(0, 10)}...
                      </span>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Indexed schemas",
            value: metrics.schemasIndexed.toString().padStart(2, "0"),
            description: "Recent schemas pulled from the indexer.",
          },
          {
            label: "Verified issuers",
            value: metrics.uniqueIssuers.toString().padStart(2, "0"),
            description: "Distinct attesters represented in the registry.",
          },
          {
            label: "Field definitions",
            value: metrics.totalFields.toString().padStart(2, "0"),
            description: "Structured fields currently exposed across schemas.",
          },
          {
            label: "Wallet-linked",
            value: metrics.mySchemas.toString().padStart(2, "0"),
            description: "Schemas owned by the connected wallet.",
          },
        ].map((item) => (
          <div key={item.label} className="metric-card">
            <p className="metric-value">{item.value}</p>
            <p className="mt-2 text-sm font-semibold tracking-[-0.02em]">{item.label}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{item.description}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="surface p-6 md:p-8">
          <p className="page-kicker">Feature editorial</p>
          <h2 className="section-title mt-3 max-w-lg">Built for institutions that want proof, not presentation.</h2>
          <p className="body-copy mt-5 max-w-xl">
            AttestCKB keeps the interaction model sparse and legible. Every important action is visible, every record can be traced,
            and the typography does most of the visual work.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Schema lifecycle",
              text: "Create structured claim templates with explicit fields and deterministic ownership.",
            },
            {
              title: "On-chain verification",
              text: "Verify any address by reading cells directly instead of trusting an off-chain summary.",
            },
            {
              title: "Revocation control",
              text: "Maintain a clear revocation path for attestations that should no longer be trusted.",
            },
            {
              title: "Wallet-led workflow",
              text: "Use the connected account as the source of truth for issuance and management.",
            },
          ].map((item) => (
            <div key={item.title} className="surface p-5">
              <p className="caption-label">{item.title}</p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="page-kicker">Product showcase</p>
            <h2 className="section-title mt-3">A monochrome workspace for issuing and reviewing attestations.</h2>
          </div>
          <Link href="/schemas" className="hidden text-xs uppercase tracking-[0.16em] text-[var(--muted)] hover:text-[var(--text)] md:inline">
            View registry {">"}
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="surface-strong p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="caption-label">Dashboard preview</p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]">Monochrome registry board</p>
              </div>
              <span className="status-pill">Terminal inspired</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: "Balance overview", value: "Verified attestations" },
                { label: "Portfolio allocation", value: "Schema coverage" },
                { label: "Transaction history", value: "Issuance and revocation logs" },
                { label: "Performance chart", value: "Verification momentum" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                  <p className="caption-label">{item.label}</p>
                  <p className="mt-4 text-sm font-medium">{item.value}</p>
                  <div className="mt-4 space-y-2">
                    {[72, 54, 88].map((width) => (
                      <div key={width} className="h-2 rounded-full border border-[var(--border)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${width}%`, backgroundColor: "var(--text)" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface p-5">
              <p className="caption-label">Recent schemas</p>
              <div className="mt-4 space-y-3">
                {loading
                  ? [0, 1, 2].map((index) => (
                      <div key={index} className="h-24 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
                    ))
                  : recent.slice(0, 3).map((schema) => <SchemaCard key={schema.schemaId} schema={schema} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="page-kicker">Trust section</p>
            <h2 className="section-title mt-3">Designed for auditability, compliance, and long-term clarity.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              "On-chain ownership",
              "Wallet authenticated",
              "Explicit revocation",
              "Transparent schemas",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--border)] px-4 py-3">
                <p className="caption-label">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-4 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)] md:flex-row md:items-center md:justify-between">
        <p>AttestCKB is built for verifiable records on CKB.</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/schemas" className="hover:text-[var(--text)]">
            Schemas
          </Link>
          <Link href="/issue" className="hover:text-[var(--text)]">
            Issue
          </Link>
          <Link href="/verify" className="hover:text-[var(--text)]">
            Verify
          </Link>
        </div>
      </footer>
    </div>
  );
}
