import { ccc } from "@ckb-ccc/connector-react";
import { SCHEMA_TYPE_SCRIPT, ATTESTATION_TYPE_SCRIPT } from "./scripts";
import {
  Schema,
  Attestation,
  decodeSchemaData,
  decodeAttestationData,
  bytesToHex,
  hexToBytes,
} from "./types";

function getClient(): ccc.ClientPublicTestnet {
  return new ccc.ClientPublicTestnet();
}

// ─── Cell parsers ─────────────────────────────────────────────────────────────

function parseSchemaCell(cell: ccc.Cell): Schema | null {
  try {
    const raw = cell.outputData;
    if (!raw || raw === "0x") return null;

    const bytes = hexToBytes(raw);
    const { name, description, fields } = decodeSchemaData(bytes);

    const attesterAddress = ccc.Address.fromScript(
      cell.cellOutput.lock,
      getClient()
    ).toString();

    // Schema ID = type script hash
    const schemaId = cell.cellOutput.type?.hash() ?? "";

    return {
      schemaId,
      name,
      description,
      fields,
      attesterAddress,
      txHash: cell.outPoint!.txHash,
      index: Number(cell.outPoint!.index),
    };
  } catch {
    return null;
  }
}

function parseAttestationCell(cell: ccc.Cell): Attestation | null {
  try {
    const raw = cell.outputData;
    if (!raw || raw === "0x") return null;

    const bytes = hexToBytes(raw);
    const { schemaId, attesterLockHash, issuedAt, data } = decodeAttestationData(bytes);

    const subjectAddress = ccc.Address.fromScript(
      cell.cellOutput.lock,
      getClient()
    ).toString();

    const attestationId = cell.cellOutput.type?.hash() ?? "";

    return {
      attestationId,
      schemaId,
      attesterLockHash,
      subjectAddress,
      issuedAt,
      data: data as Record<string, string | number | boolean>,
      txHash: cell.outPoint!.txHash,
      index: Number(cell.outPoint!.index),
    };
  } catch {
    return null;
  }
}

// ─── Schema queries ───────────────────────────────────────────────────────────

/** All schemas created by an attester address */
export async function getSchemasByAttester(address: string): Promise<Schema[]> {
  const client = getClient();
  const addr = await ccc.Address.fromString(address, client);
  const results: Schema[] = [];

  for await (const cell of client.findCells({
    script: ccc.Script.from({
      codeHash: SCHEMA_TYPE_SCRIPT.codeHash,
      hashType: SCHEMA_TYPE_SCRIPT.hashType,
      args: "0x",
    }),
    scriptType: "type",
    scriptSearchMode: "prefix",
    withData: true,
  })) {
    // Filter by attester lock (the cell's lock script)
    if (cell.cellOutput.lock.hash() !== addr.script.hash()) continue;
    const parsed = parseSchemaCell(cell);
    if (parsed) results.push(parsed);
  }

  return results;
}

/** Single schema by ID */
export async function getSchema(schemaId: string): Promise<Schema | null> {
  const client = getClient();
  const id = schemaId.startsWith("0x") ? schemaId : `0x${schemaId}`;

  for await (const cell of client.findCells({
    script: ccc.Script.from({
      codeHash: SCHEMA_TYPE_SCRIPT.codeHash,
      hashType: SCHEMA_TYPE_SCRIPT.hashType,
      args: "0x",
    }),
    scriptType: "type",
    scriptSearchMode: "prefix",
    withData: true,
  })) {
    try {
      if (cell.cellOutput.type?.hash().toLowerCase() === id.toLowerCase()) {
        return parseSchemaCell(cell);
      }
    } catch { continue; }
  }
  return null;
}

/** All schemas on testnet */
export async function getAllSchemas(limit = 100): Promise<Schema[]> {
  const client = getClient();
  const results: Schema[] = [];
  let count = 0;

  try {
    for await (const cell of client.findCells({
      script: ccc.Script.from({
        codeHash: SCHEMA_TYPE_SCRIPT.codeHash,
        hashType: SCHEMA_TYPE_SCRIPT.hashType,
        args: "0x",
      }),
      scriptType: "type",
      scriptSearchMode: "prefix",
      withData: true,
    })) {
      try {
        const parsed = parseSchemaCell(cell);
        if (parsed) {
          results.push(parsed);
          if (++count >= limit) break;
        }
      } catch { continue; }
    }
  } catch { /* return what we have */ }

  return results;
}

/** Schemas created by the connected signer */
export async function getMySchemas(signer: ccc.Signer): Promise<Schema[]> {
  const addr = await signer.getRecommendedAddressObj();
  return getSchemasByAttester(addr.toString());
}

// ─── Attestation queries ──────────────────────────────────────────────────────

/** All attestations held by a subject address */
export async function getAttestationsBySubject(address: string): Promise<Attestation[]> {
  const client = getClient();
  const addr = await ccc.Address.fromString(address, client);
  const results: Attestation[] = [];

  for await (const cell of client.findCells({
    script: ccc.Script.from({
      codeHash: ATTESTATION_TYPE_SCRIPT.codeHash,
      hashType: ATTESTATION_TYPE_SCRIPT.hashType,
      args: "0x",
    }),
    scriptType: "type",
    scriptSearchMode: "prefix",
    withData: true,
  })) {
    // Filter by subject lock (the cell's lock script)
    if (cell.cellOutput.lock.hash() !== addr.script.hash()) continue;
    try {
      const parsed = parseAttestationCell(cell);
      if (parsed) results.push(parsed);
    } catch { continue; }
  }

  return results;
}

/** All attestations issued under a specific schema */
export async function getAttestationsBySchema(schemaId: string): Promise<Attestation[]> {
  const client = getClient();
  const id = schemaId.startsWith("0x") ? schemaId : `0x${schemaId}`;
  const results: Attestation[] = [];

  for await (const cell of client.findCells({
    script: ccc.Script.from({
      codeHash: ATTESTATION_TYPE_SCRIPT.codeHash,
      hashType: ATTESTATION_TYPE_SCRIPT.hashType,
      args: "0x",
    }),
    scriptType: "type",
    scriptSearchMode: "prefix",
    withData: true,
  })) {
    try {
      const parsed = parseAttestationCell(cell);
      if (parsed && parsed.schemaId.toLowerCase() === id.toLowerCase()) {
        results.push(parsed);
      }
    } catch { continue; }
  }

  return results;
}

/** Single attestation by ID */
export async function getAttestation(attestationId: string): Promise<Attestation | null> {
  const client = getClient();
  const id = attestationId.startsWith("0x") ? attestationId : `0x${attestationId}`;

  for await (const cell of client.findCells({
    script: ccc.Script.from({
      codeHash: ATTESTATION_TYPE_SCRIPT.codeHash,
      hashType: ATTESTATION_TYPE_SCRIPT.hashType,
      args: "0x",
    }),
    scriptType: "type",
    scriptSearchMode: "prefix",
    withData: true,
  })) {
    try {
      if (cell.cellOutput.type?.hash().toLowerCase() === id.toLowerCase()) {
        return parseAttestationCell(cell);
      }
    } catch { continue; }
  }
  return null;
}

/** Attestations issued by the connected signer (by attester lock hash) */
export async function getMyIssuedAttestations(signer: ccc.Signer): Promise<Attestation[]> {
  const addr = await signer.getRecommendedAddressObj();
  const myLockHash = addr.script.hash().toLowerCase();
  const client = getClient();
  const results: Attestation[] = [];

  for await (const cell of client.findCells({
    script: ccc.Script.from({
      codeHash: ATTESTATION_TYPE_SCRIPT.codeHash,
      hashType: ATTESTATION_TYPE_SCRIPT.hashType,
      args: "0x",
    }),
    scriptType: "type",
    scriptSearchMode: "prefix",
    withData: true,
  })) {
    try {
      const parsed = parseAttestationCell(cell);
      if (parsed && parsed.attesterLockHash.toLowerCase() === myLockHash) {
        results.push(parsed);
      }
    } catch { continue; }
  }

  return results;
}

/** Attestations held by the connected signer */
export async function getMyReceivedAttestations(signer: ccc.Signer): Promise<Attestation[]> {
  const addr = await signer.getRecommendedAddressObj();
  return getAttestationsBySubject(addr.toString());
}
