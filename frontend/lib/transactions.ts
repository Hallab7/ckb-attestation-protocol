import { ccc } from "@ckb-ccc/connector-react";
import {
  SCHEMA_TYPE_SCRIPT,
  ATTESTATION_TYPE_SCRIPT,
  DEP_GROUP,
} from "./scripts";
import {
  SchemaField,
  encodeSchemaData,
  encodeAttestationData,
  hexToBytes,
  bytesToHex,
} from "./types";

const FEE_RATE = 1000;

// ─── Cell dep for both scripts via dep group ──────────────────────────────────

function scriptCellDep(): ccc.CellDep {
  return ccc.CellDep.from({
    outPoint: { txHash: DEP_GROUP.txHash, index: ccc.numFrom(DEP_GROUP.index) },
    depType: "depGroup",
  });
}

// ─── Schema transactions ──────────────────────────────────────────────────────

/**
 * Create a new schema cell.
 * Returns tx hash and schema ID (type args of the output cell).
 */
export async function createSchema(
  signer: ccc.Signer,
  name: string,
  description: string,
  fields: SchemaField[]
): Promise<{ txHash: string; schemaId: string }> {
  const attesterAddr = await signer.getRecommendedAddressObj();
  const attesterLockHash = attesterAddr.script.hash();

  const schemaType = ccc.Script.from({
    codeHash: SCHEMA_TYPE_SCRIPT.codeHash,
    hashType: SCHEMA_TYPE_SCRIPT.hashType,
    args: attesterLockHash,
  });

  const data = encodeSchemaData(name, description, fields);

  const tx = ccc.Transaction.from({
    outputs: [{ lock: attesterAddr.script, type: schemaType }],
    outputsData: [bytesToHex(data)],
  });

  tx.cellDeps.push(scriptCellDep());
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, FEE_RATE);

  const txHash = await signer.sendTransaction(tx);

  // Schema ID = type args of the output cell = blake2b(tx_hash + index)
  // The CKB node computes this — we derive it from the type script args
  // For type_id scripts, the args are set by the node. We read it back after confirmation.
  // For now return the type script hash as the schema ID.
  const schemaId = schemaType.hash();

  return { txHash, schemaId };
}

/**
 * Update an existing schema cell (attester only).
 */
export async function updateSchema(
  signer: ccc.Signer,
  schemaId: string,
  name: string,
  description: string,
  fields: SchemaField[]
): Promise<string> {
  const client = signer.client;
  const attesterAddr = await signer.getRecommendedAddressObj();
  const attesterLockHash = attesterAddr.script.hash();

  // Find the existing schema cell
  const schemaCell = await findSchemaCellById(client, schemaId);
  if (!schemaCell) throw new Error("Schema not found");

  const data = encodeSchemaData(name, description, fields);

  const tx = ccc.Transaction.from({
    inputs: [{ previousOutput: schemaCell.outPoint! }],
    outputs: [{ lock: attesterAddr.script, type: schemaCell.cellOutput.type! }],
    outputsData: [bytesToHex(data)],
  });

  tx.cellDeps.push(scriptCellDep());
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, FEE_RATE);

  return await signer.sendTransaction(tx);
}

// ─── Attestation transactions ─────────────────────────────────────────────────

/**
 * Issue an attestation to a subject address.
 * Returns tx hash and attestation ID.
 */
export async function issueAttestation(
  signer: ccc.Signer,
  schemaId: string,
  subjectAddress: string,
  data: Record<string, string | number | boolean>
): Promise<{ txHash: string; attestationId: string }> {
  const client = signer.client;
  const attesterAddr = await signer.getRecommendedAddressObj();
  const attesterLockHash = attesterAddr.script.hash();

  const subjectAddr = await ccc.Address.fromString(subjectAddress, client);

  // Get current block number for issued_at
  const tip = await client.getTip();
  const issuedAt = BigInt(tip);

  // Build attestation type script args: [schema_id: 32][attester_lock_hash: 32]
  const schemaIdBytes = hexToBytes(schemaId.startsWith("0x") ? schemaId : `0x${schemaId}`);
  const attesterHashBytes = hexToBytes(attesterLockHash);
  const attArgs = new Uint8Array(64);
  attArgs.set(schemaIdBytes.slice(0, 32), 0);
  attArgs.set(attesterHashBytes.slice(0, 32), 32);

  const attType = ccc.Script.from({
    codeHash: ATTESTATION_TYPE_SCRIPT.codeHash,
    hashType: ATTESTATION_TYPE_SCRIPT.hashType,
    args: bytesToHex(attArgs),
  });

  const attData = encodeAttestationData(
    bytesToHex(schemaIdBytes.slice(0, 32)),
    attesterLockHash,
    issuedAt,
    data
  );

  const tx = ccc.Transaction.from({
    outputs: [{ lock: subjectAddr.script, type: attType }],
    outputsData: [bytesToHex(attData)],
  });

  tx.cellDeps.push(scriptCellDep());

  // Add schema cell as cell dep so the script can verify it exists
  const schemaCell = await findSchemaCellById(client, schemaId);
  if (schemaCell?.outPoint) {
    tx.cellDeps.push(
      ccc.CellDep.from({ outPoint: schemaCell.outPoint, depType: "code" })
    );
  }

  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, FEE_RATE);

  const txHash = await signer.sendTransaction(tx);
  const attestationId = attType.hash();

  return { txHash, attestationId };
}

/**
 * Revoke an attestation (attester only).
 * Consumes the attestation cell — CKB returned to attester.
 */
export async function revokeAttestation(
  signer: ccc.Signer,
  attestationId: string
): Promise<string> {
  const client = signer.client;
  const attesterAddr = await signer.getRecommendedAddressObj();

  const attCell = await findAttestationCellById(client, attestationId);
  if (!attCell) throw new Error("Attestation not found");

  const tx = ccc.Transaction.from({
    inputs: [{ previousOutput: attCell.outPoint! }],
    outputs: [{ lock: attesterAddr.script }],
    outputsData: ["0x"],
  });

  tx.cellDeps.push(scriptCellDep());
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, FEE_RATE);

  return await signer.sendTransaction(tx);
}

// ─── Cell lookup helpers ──────────────────────────────────────────────────────

async function findSchemaCellById(
  client: ccc.Client,
  schemaId: string
): Promise<ccc.Cell | null> {
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
    if (cell.cellOutput.type?.hash().toLowerCase() === id.toLowerCase()) {
      return cell;
    }
  }
  return null;
}

async function findAttestationCellById(
  client: ccc.Client,
  attestationId: string
): Promise<ccc.Cell | null> {
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
    if (cell.cellOutput.type?.hash().toLowerCase() === id.toLowerCase()) {
      return cell;
    }
  }
  return null;
}
