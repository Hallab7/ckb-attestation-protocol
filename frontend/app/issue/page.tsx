"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCcc } from "@ckb-ccc/connector-react";
import { createSchema } from "@/lib/transactions";
import { SchemaField } from "@/lib/types";

export default function IssuePage() {
  const router = useRouter();
  const { open, signerInfo } = useCcc();
  const [form, setForm] = useState({ name: "", description: "" });
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [newField, setNewField] = useState({ name: "", type: "string" as SchemaField["type"], required: false });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ txHash: string; schemaId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addField() {
    if (!newField.name.trim()) return;
    setFields((f) => [...f, { ...newField }]);
    setNewField({ name: "", type: "string", required: false });
  }

  function removeField(i: number) {
    setFields((f) => f.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signerInfo?.signer) { open(); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await createSchema(signerInfo.signer, form.name, form.description, fields);
      setResult(res);
    } catch (e: any) { setError(e?.message ?? "Transaction failed"); }
    finally { setSubmitting(false); }
  }

  if (result) return (
    <div className="max-w-xl mx-auto text-center py-16">
      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-900 mb-2">Schema Created!</h2>
      <p className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-2 rounded-lg mb-4 break-all">{result.schemaId}</p>
      <a href={`https://testnet.explorer.nervos.org/transaction/${result.txHash}`} target="_blank" rel="noopener noreferrer"
        className="text-xs text-violet-600 underline block mb-6">View transaction →</a>
      <div className="flex gap-3 justify-center">
        <button onClick={() => router.push(`/issue/${result.schemaId}`)}
          className="bg-violet-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-violet-700">
          Issue Attestations Now
        </button>
        <button onClick={() => { setResult(null); setForm({ name: "", description: "" }); setFields([]); }}
          className="border border-slate-200 text-slate-600 text-sm font-medium px-5 py-2 rounded-lg hover:border-slate-300">
          Create Another
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Create Attestation Schema</h1>
        <p className="text-sm text-slate-500">Define the structure of your attestations. You'll be able to issue attestations of this type to any address.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <Field label="Schema Name">
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. CKBuilder Completion" className="input" required />
        </Field>

        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What this attestation certifies..." rows={3} className="input resize-none" required />
        </Field>

        {/* Fields */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Fields</label>
          {fields.length > 0 && (
            <div className="mb-2 space-y-1">
              {fields.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-700 font-medium">{f.name}</span>
                  <span className="text-slate-400">{f.type}{f.required ? " · required" : ""}</span>
                  <button type="button" onClick={() => removeField(i)} className="text-slate-400 hover:text-red-500 ml-2">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" value={newField.name} onChange={(e) => setNewField((f) => ({ ...f, name: e.target.value }))}
              placeholder="Field name" className="input flex-1" />
            <select value={newField.type} onChange={(e) => setNewField((f) => ({ ...f, type: e.target.value as SchemaField["type"] }))}
              className="input w-28">
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
            </select>
            <label className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
              <input type="checkbox" checked={newField.required} onChange={(e) => setNewField((f) => ({ ...f, required: e.target.checked }))} />
              req
            </label>
            <button type="button" onClick={addField}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 shrink-0">
              Add
            </button>
          </div>
        </div>

        {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{error}</div>}

        <button type="submit" disabled={!form.name.trim() || !form.description.trim() || submitting}
          className="w-full bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed">
          {submitting ? "Creating..." : !signerInfo?.signer ? "Connect Wallet to Continue" : "Create Schema"}
        </button>
      </form>

      <style jsx>{`
        .input { width: 100%; padding: 0.5rem 0.75rem; font-size: 0.875rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: white; outline: none; color: #0f172a; }
        .input:focus { border-color: #94a3b8; }
        .input::placeholder { color: #94a3b8; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
