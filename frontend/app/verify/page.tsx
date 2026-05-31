"use client";

import { useState } from "react";
import { AttestationCard } from "@/components/AttestationCard";
import { getAttestationsBySubject } from "@/lib/indexer";
import { Attestation } from "@/lib/types";

export default function VerifyPage() {
  const [address, setAddress] = useState("");
  const [attestations, setAttestations] = useState<Attestation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError(null);
    setAttestations(null);
    try {
      const results = await getAttestationsBySubject(address.trim());
      setAttestations(results);
      setSearched(address.trim());
    } catch {
      setError("Failed to query attestations. Check the address and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="space-y-4">
        <p className="page-kicker">Verification</p>
        <h1 className="section-title">Verify attestations</h1>
        <p className="body-copy">Paste any CKB address to inspect the attestations it currently holds on-chain.</p>
      </section>

      <form onSubmit={handleSearch} className="surface flex flex-col gap-3 p-4 md:flex-row md:items-center md:p-5">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="ckt1q..."
          className="input-field font-mono"
        />
        <button type="submit" disabled={!address.trim() || loading} className="btn-primary md:w-auto">
          {loading ? "Searching..." : "Verify"}
        </button>
      </form>

      {error && (
        <div className="surface px-4 py-3 text-sm text-[var(--muted)]">
          {error}
        </div>
      )}

      {attestations !== null && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {attestations.length} attestation{attestations.length !== 1 ? "s" : ""} found
              </p>
              <p className="mt-1 max-w-full truncate font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                {searched}
              </p>
            </div>
            {attestations.length > 0 && <span className="status-pill">Verified on-chain</span>}
          </div>

          {attestations.length === 0 ? (
            <div className="surface py-16 text-center text-[var(--muted)]">
              <p className="text-sm">No attestations found for this address.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {attestations.map((attestation) => (
                <AttestationCard key={attestation.attestationId} attestation={attestation} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
