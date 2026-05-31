import Link from "next/link";
import { Schema } from "@/lib/types";

export function SchemaCard({ schema, actionHref }: { schema: Schema; actionHref?: string }) {
  const href = actionHref ?? `/schemas/${schema.schemaId}`;
  return (
    <Link href={href}>
      <div className="surface p-5 transition-all duration-150 cursor-pointer group hover:-translate-y-0.5 hover:border-[var(--border-strong)]">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]">
          <span className="font-display text-lg font-semibold">{schema.name.charAt(0)}</span>
        </div>
        <h3 className="mb-2 line-clamp-1 text-sm font-semibold tracking-[-0.02em] group-hover:underline">
          {schema.name}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm text-[var(--muted)]">{schema.description}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            {schema.attesterAddress.slice(0, 12)}...
          </span>
          <span className="status-pill">{schema.fields.length} fields</span>
        </div>
      </div>
    </Link>
  );
}
