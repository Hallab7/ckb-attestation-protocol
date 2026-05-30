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
  const issuer = (attestation.data.issuer as string) ?? attestation.attesterLockHash.slice(0, 16) + "...";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm line-clamp-1">{name}</p>
          <p className="text-xs text-slate-500">by {issuer}</p>
        </div>
        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">Verified</span>
      </div>

      {/* Data fields */}
      <div className="space-y-1 mb-3">
        {Object.entries(attestation.data).filter(([k]) => k !== "name" && k !== "issuer").slice(0, 3).map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-slate-400">{k}</span>
            <span className="text-slate-700 font-medium">{String(v)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <Link href={`/attestations/${attestation.attestationId}`} className="text-xs text-violet-600 hover:text-violet-800 font-medium">
          View on-chain →
        </Link>
        <span className="text-xs text-slate-400">Block #{attestation.issuedAt.toString()}</span>
      </div>

      {showRevoke && (
        <button onClick={onRevoke} disabled={revoking}
          className="mt-3 w-full text-xs font-medium py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40">
          {revoking ? "Revoking..." : "Revoke"}
        </button>
      )}
    </div>
  );
}
