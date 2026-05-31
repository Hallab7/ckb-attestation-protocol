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
    setFields((current) => [...current, { ...newField }]);
    setNewField({ name: "", type: "string", required: false });
  }

  function removeField(index: number) {
    setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signerInfo?.signer) {
      open();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await createSchema(signerInfo.signer, form.name, form.description, fields);
      setResult(res);
    } catch (err: any) {
      setError(err?.message ?? "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <div className="surface px-6 py-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="page-kicker">Schema created</p>
          <h1 className="section-title mt-3">Your schema is ready to issue against.</h1>
          <p className="mt-4 text-sm text-[var(--muted)]">Schema ID</p>
          <p className="mt-2 break-all rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-xs">{result.schemaId}</p>
          <a
            href={`https://testnet.explorer.nervos.org/transaction/${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex text-xs uppercase tracking-[0.16em] text-[var(--muted)] hover:text-[var(--text)]"
          >
            View transaction {">"}
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => router.push(`/issue/${result.schemaId}`)} className="btn-primary">
            Issue attestations
          </button>
          <button
            onClick={() => {
              setResult(null);
              setForm({ name: "", description: "" });
              setFields([]);
            }}
            className="btn-secondary"
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-4">
        <p className="page-kicker">Schema builder</p>
        <h1 className="section-title">Create an attestation schema</h1>
        <p className="body-copy">
          Define the structure of your claims, then issue attestations against it from the same editorial workspace.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="surface space-y-5 p-5 md:p-6">
        <Field label="Schema name">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            placeholder="e.g. CKBuilder completion"
            className="input-field"
            required
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
            placeholder="What this attestation certifies"
            rows={4}
            className="input-field resize-none"
            required
          />
        </Field>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <label className="block text-sm font-medium">Fields</label>
            <span className="text-xs text-[var(--muted)]">{fields.length} defined</span>
          </div>

          {fields.length > 0 && (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={`${field.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{field.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {field.type}
                      {field.required ? " / required" : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeField(index)} className="text-xs uppercase tracking-[0.16em] text-[var(--muted)] hover:text-[var(--text)]">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-[1fr_140px_auto_auto]">
            <input
              type="text"
              value={newField.name}
              onChange={(e) => setNewField((current) => ({ ...current, name: e.target.value }))}
              placeholder="Field name"
              className="input-field"
            />
            <select
              value={newField.type}
              onChange={(e) => setNewField((current) => ({ ...current, type: e.target.value as SchemaField["type"] }))}
              className="input-field"
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
            </select>
            <label className="flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              <input
                type="checkbox"
                checked={newField.required}
                onChange={(e) => setNewField((current) => ({ ...current, required: e.target.checked }))}
              />
              required
            </label>
            <button type="button" onClick={addField} className="btn-secondary">
              Add field
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!form.name.trim() || !form.description.trim() || submitting}
          className="btn-primary w-full rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating..." : !signerInfo?.signer ? "Connect wallet to continue" : "Create schema"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
