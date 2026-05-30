import Link from "next/link";
import { Schema } from "@/lib/types";

export function SchemaCard({ schema, actionHref }: { schema: Schema; actionHref?: string }) {
  const href = actionHref ?? `/schemas/${schema.schemaId}`;
  return (
    <Link href={href}>
      <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer group">
        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center mb-3">
          <span className="text-violet-600 text-lg font-bold">{schema.name.charAt(0)}</span>
        </div>
        <h3 className="font-semibold text-slate-900 text-sm mb-1 group-hover:text-violet-600 line-clamp-1">{schema.name}</h3>
        <p className="text-slate-500 text-xs line-clamp-2 mb-3">{schema.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono truncate max-w-32">{schema.attesterAddress.slice(0, 12)}...</span>
          <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-medium">{schema.fields.length} fields</span>
        </div>
      </div>
    </Link>
  );
}
