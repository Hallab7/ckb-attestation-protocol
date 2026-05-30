export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
}

export interface Schema {
  schemaId: string;
  name: string;
  description: string;
  fields: SchemaField[];
  attesterAddress: string;
  txHash: string;
  index: number;
}

export interface Attestation {
  attestationId: string;
  schemaId: string;
  attesterLockHash: string;
  subjectAddress: string;
  issuedAt: bigint;
  data: Record<string, string | number | boolean>;
  txHash: string;
  index: number;
}

// ─── Codec ────────────────────────────────────────────────────────────────────

/**
 * Schema cell data layout:
 * [name_len: 2 LE][name][desc_len: 2 LE][desc][fields_len: 2 LE][fields_json]
 */
export function encodeSchemaData(
  name: string,
  description: string,
  fields: SchemaField[]
): Uint8Array {
  const enc = new TextEncoder();
  const nameB = enc.encode(name);
  const descB = enc.encode(description);
  const fieldsB = enc.encode(JSON.stringify(fields));

  const buf = new Uint8Array(2 + nameB.length + 2 + descB.length + 2 + fieldsB.length);
  const view = new DataView(buf.buffer);
  let offset = 0;

  view.setUint16(offset, nameB.length, true); offset += 2;
  buf.set(nameB, offset); offset += nameB.length;
  view.setUint16(offset, descB.length, true); offset += 2;
  buf.set(descB, offset); offset += descB.length;
  view.setUint16(offset, fieldsB.length, true); offset += 2;
  buf.set(fieldsB, offset);

  return buf;
}

export function decodeSchemaData(raw: Uint8Array): { name: string; description: string; fields: SchemaField[] } {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const dec = new TextDecoder();
  let offset = 0;

  const nameLen = view.getUint16(offset, true); offset += 2;
  const name = dec.decode(raw.slice(offset, offset + nameLen)); offset += nameLen;
  const descLen = view.getUint16(offset, true); offset += 2;
  const description = dec.decode(raw.slice(offset, offset + descLen)); offset += descLen;
  const fieldsLen = view.getUint16(offset, true); offset += 2;
  const fieldsJson = dec.decode(raw.slice(offset, offset + fieldsLen));
  const fields: SchemaField[] = fieldsLen > 0 ? JSON.parse(fieldsJson) : [];

  return { name, description, fields };
}

/**
 * Attestation cell data layout:
 * [schema_id: 32][attester_lock_hash: 32][issued_at: 8 LE u64][data_len: 2 LE][data_json]
 */
export function encodeAttestationData(
  schemaId: string,
  attesterLockHash: string,
  issuedAt: bigint,
  data: Record<string, unknown>
): Uint8Array {
  const schemaBytes = hexToBytes(schemaId);
  const attesterBytes = hexToBytes(attesterLockHash);
  const dataJson = new TextEncoder().encode(JSON.stringify(data));

  const buf = new Uint8Array(32 + 32 + 8 + 2 + dataJson.length);
  const view = new DataView(buf.buffer);
  let offset = 0;

  buf.set(schemaBytes, offset); offset += 32;
  buf.set(attesterBytes, offset); offset += 32;
  view.setBigUint64(offset, issuedAt, true); offset += 8;
  view.setUint16(offset, dataJson.length, true); offset += 2;
  buf.set(dataJson, offset);

  return buf;
}

export function decodeAttestationData(raw: Uint8Array): {
  schemaId: string;
  attesterLockHash: string;
  issuedAt: bigint;
  data: Record<string, unknown>;
} {
  if (raw.length < 74) throw new Error("Attestation data too short");
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  const schemaId = bytesToHex(raw.slice(0, 32));
  const attesterLockHash = bytesToHex(raw.slice(32, 64));
  const issuedAt = view.getBigUint64(64, true);
  const dataLen = view.getUint16(72, true);
  const dataJson = new TextDecoder().decode(raw.slice(74, 74 + dataLen));
  const data = dataLen > 0 ? JSON.parse(dataJson) : {};

  return { schemaId, attesterLockHash, issuedAt, data };
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
