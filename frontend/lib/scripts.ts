/**
 * Deployed script configuration — CKB Testnet
 * Deployed: 2026-05-30
 * Cell tx:      0x43649fed1d7213c909e9c961f76394bf62fb2551c8e391718c83e6a1a4797f58
 * DepGroup tx:  0x8a11e0b8313b382d7b23f6d7ef0bdb2e1f35c8af971af0784edc41c47d717ae0
 */

export const SCHEMA_TYPE_SCRIPT = {
  codeHash: "0x4414ee0829c78dad441a82694c63511dd1f548a8e8639c1861987f8a8fa0a34b" as `0x${string}`,
  hashType: "data1" as const,
  txHash: "0x43649fed1d7213c909e9c961f76394bf62fb2551c8e391718c83e6a1a4797f58" as `0x${string}`,
  index: 0,
};

export const ATTESTATION_TYPE_SCRIPT = {
  codeHash: "0x088b2248fcbc110a11bf87b8f672c5af48d0e9aacd3d3b6b01136ec0442d3957" as `0x${string}`,
  hashType: "data1" as const,
  txHash: "0x43649fed1d7213c909e9c961f76394bf62fb2551c8e391718c83e6a1a4797f58" as `0x${string}`,
  index: 1,
};

export const DEP_GROUP = {
  txHash: "0x8a11e0b8313b382d7b23f6d7ef0bdb2e1f35c8af971af0784edc41c47d717ae0" as `0x${string}`,
  index: 0,
};

// Type IDs (for upgradeable references)
export const SCHEMA_TYPE_ID = "0x690efa2589d23cdc44de0ebddd6136e8b1afb375a0d749175e043266c80c8b7e";
export const ATTESTATION_TYPE_ID = "0xae33150a50eb5c5130bfcd5fff367fceb598f8ca3e71c63a37614243d0b6620f";

export const CKB_TESTNET_URL = "https://testnet.ckb.dev/rpc";
export const SCRIPTS_DEPLOYED = true;
