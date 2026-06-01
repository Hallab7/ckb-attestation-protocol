# CKB Attestation Protocol

A composable on-chain attestation system built on Nervos CKB. Define schemas, issue verifiable attestations to any address, and revoke them. Each attestation is a cell owned by the subject — verifiable by anyone reading the chain.

## How It Works

```
Attester creates a Schema Cell (defines attestation structure)
    ↓
Attester issues an Attestation Cell to a subject's address
    ↓
Subject owns the cell — it's a first-class CKB asset
    ↓
Anyone can verify by reading the cell on-chain
    ↓
Attester can revoke by consuming the cell (CKB returned)
```

## Key Differences from Spore DOB Credentials

| | Spore DOBs | Attestation Protocol |
|--|--|--|
| Scripts | Pre-deployed Spore | Custom Rust scripts |
| Revocable | No | Yes — attester can burn |
| Schema | Implicit | Explicit on-chain schema cell |
| Transfer | Allowed | Blocked by type script |
| Composability | Limited | Other scripts can read attestations |

## Cell Structures

### Schema Cell

```
data:   [name_len: 2 LE][name][desc_len: 2 LE][desc][fields_len: 2 LE][fields_json]
type:   schema-type script, args = [attester_lock_hash: 32]
lock:   attester's lock
```

### Attestation Cell

```
data:   [schema_id: 32][attester_lock_hash: 32][issued_at: 8 LE u64][data_len: 2 LE][data_json]
type:   attestation-type script, args = [schema_id: 32][attester_lock_hash: 32]
lock:   subject's lock
```

## Deployed Scripts (Testnet)

| Script | Code Hash | Tx Hash |
|--------|-----------|---------|
| schema-type | `0x4414ee0829c78dad441a82694c63511dd1f548a8e8639c1861987f8a8fa0a34b` | `0x43649fed...7f58` index 0 |
| attestation-type | `0x088b2248fcbc110a11bf87b8f672c5af48d0e9aacd3d3b6b01136ec0442d3957` | `0x43649fed...7f58` index 1 |
| dep-group | — | `0x8a11e0b8313b382d7b23f6d7ef0bdb2e1f35c8af971af0784edc41c47d717ae0` index 0 |

## Project Structure

```
contracts/
  schema-type/src/main.rs       # Validates schema cell creation and updates
  attestation-type/src/main.rs  # Validates attestation lifecycle (create/revoke/block-transfer)
tests/src/tests.rs              # 7 test cases covering all operations
deployment/                     # Deployment config and migration files
frontend/                       # Next.js app
  lib/scripts.ts                # Deployed contract addresses
  lib/types.ts                  # Types + codec (must match Rust byte layout)
  lib/transactions.ts           # createSchema, issueAttestation, revokeAttestation
  lib/indexer.ts                # Query schemas and attestations from chain
  app/                          # Pages: home, schemas, issue, wallet, verify
```

## Getting Started

### On-chain scripts

```bash
# Install RISC-V target
rustup target add riscv64imac-unknown-none-elf

# Build
$env:CLANG="C:\Program Files\LLVM\bin\clang.exe"
$env:TARGET_CC="C:\Program Files\LLVM\bin\clang.exe"
$env:TARGET_AR="C:\Program Files\LLVM\bin\llvm-ar.exe"
$env:RUSTFLAGS="-C target-feature=+zba,+zbb,+zbc,+zbs,-a -C debug-assertions"
cargo build --target=riscv64imac-unknown-none-elf --release -p schema-type -p attestation-type

# Test
$env:RUSTFLAGS=""
$env:MODE="release"
$env:TOP=$PWD
cargo test --package tests -- --nocapture
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Connect a CKB testnet wallet (JoyID or MetaMask).

## Tests

7 test cases, all passing:

| Test | Description |
|------|-------------|
| `test_create_schema` | Attester creates a schema cell |
| `test_update_schema` | Attester updates schema description |
| `test_unauthorized_schema_update_fails` | Non-attester cannot update |
| `test_issue_attestation` | Attester issues to subject |
| `test_revoke_attestation` | Attester revokes |
| `test_unauthorized_revoke_fails` | Subject cannot revoke |
| `test_transfer_attestation_fails` | Transfer is blocked |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Scripts | Rust + ckb-std, compiled to RISC-V |
| Testing | ckb-testtool |
| Frontend | Next.js 16 + TypeScript |
| CKB SDK | CCC (`@ckb-ccc/connector-react`) |
| Wallet | JoyID / MetaMask (via CCC) |
| Styling | Tailwind CSS |
| Network | CKB Testnet |

## License

MIT
