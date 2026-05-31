import Link from "next/link";
import { Attestation } from "@/lib/types";

export function AttestationCard({
  attestation,
  showRevoke,
  onRevoke,
  revoking,
}: {
  attestation: Attestation;
  showRevoke?: boolean;
  onRevoke?: () => void;
  revoking?: boolean;
}) {
  const name = (attestation.data.name as string) ?? "Attestation";
  const issuer = (attestation.data.issuer as string) ?? `${attestation.attesterLockHash.slice(0, 16)}...`;

  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold tracking-[-0.02em]">{name}</p>
          <p className="text-xs text-[var(--muted)]">by {issuer}</p>
        </div>
        <span className="status-pill shrink-0">Verified</span>
      </div>

      <div className="mb-4 space-y-0.5">
        {Object.entries(attestation.data)
          .filter(([key]) => key !== "name" && key !== "issuer")
          .slice(0, 3)
          .map(([key, value]) => (
            <div key={key} className="data-row border-t-0 px-0 py-2 first:pt-0">
              <span className="text-[var(--muted)]">{key}</span>
              <span className="text-right font-medium">{String(value)}</span>
            </div>
          ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <Link
          href={`/attestations/${attestation.attestationId}`}
          className="text-xs uppercase tracking-[0.16em] text-[var(--muted)] hover:text-[var(--text)]"
        >
          View on-chain {">"}
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Block #{attestation.issuedAt.toString()}
        </span>
      </div>

      {showRevoke && (
        <button
          onClick={onRevoke}
          disabled={revoking}
          className="btn-secondary mt-4 w-full rounded-2xl text-xs uppercase tracking-[0.16em] disabled:opacity-40"
        >
          {revoking ? "Revoking..." : "Revoke"}
        </button>
      )}
    </div>
  );
}
