use ckb_testtool::{
    ckb_types::{bytes::Bytes, core::TransactionBuilder, packed::*, prelude::*},
    context::Context,
};
use crate::Loader;

const ALWAYS_SUCCESS: &[u8] = include_bytes!("../../build/debug/always_success");

// ─── Data encoding helpers ────────────────────────────────────────────────────

/// Encode schema cell data: [name_len: 2 LE][name][desc_len: 2 LE][desc][fields_len: 2 LE][fields_json]
fn encode_schema(name: &str, description: &str, fields_json: &str) -> Bytes {
    let mut data = Vec::new();
    let name_b = name.as_bytes();
    let desc_b = description.as_bytes();
    let fields_b = fields_json.as_bytes();
    data.extend_from_slice(&(name_b.len() as u16).to_le_bytes());
    data.extend_from_slice(name_b);
    data.extend_from_slice(&(desc_b.len() as u16).to_le_bytes());
    data.extend_from_slice(desc_b);
    data.extend_from_slice(&(fields_b.len() as u16).to_le_bytes());
    data.extend_from_slice(fields_b);
    Bytes::from(data)
}

/// Encode attestation cell data:
/// [schema_id: 32][attester_lock_hash: 32][issued_at: 8 LE][data_len: 2 LE][data_json]
fn encode_attestation(
    schema_id: &[u8; 32],
    attester_lock_hash: &[u8; 32],
    issued_at: u64,
    data_json: &str,
) -> Bytes {
    let mut data = Vec::new();
    data.extend_from_slice(schema_id);
    data.extend_from_slice(attester_lock_hash);
    data.extend_from_slice(&issued_at.to_le_bytes());
    let json_b = data_json.as_bytes();
    data.extend_from_slice(&(json_b.len() as u16).to_le_bytes());
    data.extend_from_slice(json_b);
    Bytes::from(data)
}

fn fake_hash(seed: u8) -> [u8; 32] {
    [seed; 32]
}

fn script_hash(script: &Script) -> [u8; 32] {
    let h = script.calc_script_hash();
    let mut out = [0u8; 32];
    out.copy_from_slice(h.as_slice());
    out
}

struct Contracts {
    schema_type_out_point: OutPoint,
    attestation_type_out_point: OutPoint,
    always_success_out_point: OutPoint,
}

fn deploy_contracts(context: &mut Context) -> Contracts {
    let always_success_out_point = context.deploy_cell(Bytes::from(ALWAYS_SUCCESS));
    let schema_bin = Loader::default().load_binary("schema-type");
    let attestation_bin = Loader::default().load_binary("attestation-type");
    Contracts {
        schema_type_out_point: context.deploy_cell(schema_bin),
        attestation_type_out_point: context.deploy_cell(attestation_bin),
        always_success_out_point,
    }
}

fn always_success_lock(context: &mut Context, out_point: &OutPoint, seed: u8) -> Script {
    context.build_script(out_point, Bytes::from(vec![seed])).expect("script")
}

// ─── Schema Tests ─────────────────────────────────────────────────────────────

/// Attester creates a schema
#[test]
fn test_create_schema() {
    let mut context = Context::default();
    let c = deploy_contracts(&mut context);

    let attester_lock = always_success_lock(&mut context, &c.always_success_out_point, 1);
    let attester_hash = script_hash(&attester_lock);

    let schema_type = context
        .build_script(&c.schema_type_out_point, Bytes::from(attester_hash.to_vec()))
        .expect("schema type");

    let schema_data = encode_schema(
        "CKBuilder Completion",
        "Awarded for completing CKBuilder program",
        r#"[{"name":"week","type":"string","required":true}]"#,
    );

    let attester_cell = context.create_cell(
        CellOutput::new_builder().capacity(1_000_000_000u64).lock(attester_lock.clone()).build(),
        Bytes::new(),
    );

    let tx = TransactionBuilder::default()
        .input(CellInput::new_builder().previous_output(attester_cell).build())
        .outputs(vec![
            CellOutput::new_builder()
                .capacity(500_000_000u64)
                .lock(attester_lock.clone())
                .type_(Some(schema_type).pack())
                .build(),
            CellOutput::new_builder()
                .capacity(499_000_000u64)
                .lock(attester_lock)
                .build(),
        ])
        .outputs_data(vec![schema_data, Bytes::new()].pack())
        .cell_dep(CellDep::new_builder().out_point(c.always_success_out_point.clone()).build())
        .cell_dep(CellDep::new_builder().out_point(c.schema_type_out_point.clone()).build())
        .build();
    let tx = context.complete_tx(tx);

    let cycles = context.verify_tx(&tx, 10_000_000).expect("create schema should pass");
    println!("test_create_schema cycles: {}", cycles);
}

/// Attester updates a schema
#[test]
fn test_update_schema() {
    let mut context = Context::default();
    let c = deploy_contracts(&mut context);

    let attester_lock = always_success_lock(&mut context, &c.always_success_out_point, 1);
    let attester_hash = script_hash(&attester_lock);

    let schema_type = context
        .build_script(&c.schema_type_out_point, Bytes::from(attester_hash.to_vec()))
        .expect("schema type");

    let old_data = encode_schema("Old Name", "Old desc", "[]");
    let schema_cell = context.create_cell(
        CellOutput::new_builder()
            .capacity(500_000_000u64)
            .lock(attester_lock.clone())
            .type_(Some(schema_type.clone()).pack())
            .build(),
        old_data,
    );

    let attester_cell = context.create_cell(
        CellOutput::new_builder().capacity(500_000_000u64).lock(attester_lock.clone()).build(),
        Bytes::new(),
    );

    let new_data = encode_schema("Updated Name", "Updated description", r#"[{"name":"score","type":"number","required":false}]"#);

    let tx = TransactionBuilder::default()
        .inputs(vec![
            CellInput::new_builder().previous_output(schema_cell).build(),
            CellInput::new_builder().previous_output(attester_cell).build(),
        ])
        .outputs(vec![
            CellOutput::new_builder()
                .capacity(500_000_000u64)
                .lock(attester_lock.clone())
                .type_(Some(schema_type).pack())
                .build(),
            CellOutput::new_builder().capacity(499_000_000u64).lock(attester_lock).build(),
        ])
        .outputs_data(vec![new_data, Bytes::new()].pack())
        .cell_dep(CellDep::new_builder().out_point(c.always_success_out_point.clone()).build())
        .cell_dep(CellDep::new_builder().out_point(c.schema_type_out_point.clone()).build())
        .build();
    let tx = context.complete_tx(tx);

    let cycles = context.verify_tx(&tx, 10_000_000).expect("update schema should pass");
    println!("test_update_schema cycles: {}", cycles);
}

/// Non-attester cannot update schema — should fail
/// The schema type script args contain the attester's lock hash.
/// An attacker who doesn't control the attester's lock cannot update.
#[test]
fn test_unauthorized_schema_update_fails() {
    let mut context = Context::default();
    let c = deploy_contracts(&mut context);

    let attester_lock = always_success_lock(&mut context, &c.always_success_out_point, 1);
    let attacker_lock = always_success_lock(&mut context, &c.always_success_out_point, 99);
    let attester_hash = script_hash(&attester_lock);
    // Attacker's hash is different — it will NOT match the schema args
    let attacker_hash = script_hash(&attacker_lock);

    // Schema args contain the ATTESTER's lock hash
    let schema_type = context
        .build_script(&c.schema_type_out_point, Bytes::from(attester_hash.to_vec()))
        .expect("schema type");

    let old_data = encode_schema("Name", "Desc", "[]");
    // Schema cell uses ATTACKER's lock (simulating attacker somehow got the cell)
    // but the type script args still say the ATTESTER must sign
    let schema_cell = context.create_cell(
        CellOutput::new_builder()
            .capacity(500_000_000u64)
            .lock(attacker_lock.clone())  // attacker owns the cell lock
            .type_(Some(schema_type.clone()).pack())
            .build(),
        old_data,
    );

    let attacker_cell = context.create_cell(
        CellOutput::new_builder().capacity(500_000_000u64).lock(attacker_lock.clone()).build(),
        Bytes::new(),
    );

    let new_data = encode_schema("Hacked", "Hacked desc", "[]");

    // Attacker signs (only attacker's lock hash in inputs), but type script requires attester
    let tx = TransactionBuilder::default()
        .inputs(vec![
            CellInput::new_builder().previous_output(schema_cell).build(),
            CellInput::new_builder().previous_output(attacker_cell).build(),
        ])
        .outputs(vec![
            CellOutput::new_builder()
                .capacity(500_000_000u64)
                .lock(attacker_lock.clone())
                .type_(Some(schema_type).pack())
                .build(),
            CellOutput::new_builder().capacity(499_000_000u64).lock(attacker_lock).build(),
        ])
        .outputs_data(vec![new_data, Bytes::new()].pack())
        .cell_dep(CellDep::new_builder().out_point(c.always_success_out_point.clone()).build())
        .cell_dep(CellDep::new_builder().out_point(c.schema_type_out_point.clone()).build())
        .build();
    let tx = context.complete_tx(tx);

    assert!(context.verify_tx(&tx, 10_000_000).is_err(), "unauthorized update should fail");
    println!("test_unauthorized_schema_update_fails: correctly rejected");
}

// ─── Attestation Tests ────────────────────────────────────────────────────────

/// Attester issues an attestation to a subject
#[test]
fn test_issue_attestation() {
    let mut context = Context::default();
    let c = deploy_contracts(&mut context);

    let attester_lock = always_success_lock(&mut context, &c.always_success_out_point, 1);
    let subject_lock = always_success_lock(&mut context, &c.always_success_out_point, 2);
    let attester_hash = script_hash(&attester_lock);

    let schema_id = fake_hash(10);
    let att_args: Vec<u8> = schema_id.iter().chain(attester_hash.iter()).cloned().collect();

    let att_type = context
        .build_script(&c.attestation_type_out_point, Bytes::from(att_args))
        .expect("attestation type");

    let att_data = encode_attestation(
        &schema_id,
        &attester_hash,
        1000,
        r#"{"week":"1","score":"100"}"#,
    );

    let attester_cell = context.create_cell(
        CellOutput::new_builder().capacity(1_000_000_000u64).lock(attester_lock.clone()).build(),
        Bytes::new(),
    );

    let tx = TransactionBuilder::default()
        .input(CellInput::new_builder().previous_output(attester_cell).build())
        .outputs(vec![
            CellOutput::new_builder()
                .capacity(500_000_000u64)
                .lock(subject_lock)
                .type_(Some(att_type).pack())
                .build(),
            CellOutput::new_builder().capacity(499_000_000u64).lock(attester_lock).build(),
        ])
        .outputs_data(vec![att_data, Bytes::new()].pack())
        .cell_dep(CellDep::new_builder().out_point(c.always_success_out_point.clone()).build())
        .cell_dep(CellDep::new_builder().out_point(c.attestation_type_out_point.clone()).build())
        .build();
    let tx = context.complete_tx(tx);

    let cycles = context.verify_tx(&tx, 10_000_000).expect("issue attestation should pass");
    println!("test_issue_attestation cycles: {}", cycles);
}

/// Attester revokes an attestation
#[test]
fn test_revoke_attestation() {
    let mut context = Context::default();
    let c = deploy_contracts(&mut context);

    let attester_lock = always_success_lock(&mut context, &c.always_success_out_point, 1);
    let subject_lock = always_success_lock(&mut context, &c.always_success_out_point, 2);
    let attester_hash = script_hash(&attester_lock);

    let schema_id = fake_hash(10);
    let att_args: Vec<u8> = schema_id.iter().chain(attester_hash.iter()).cloned().collect();

    let att_type = context
        .build_script(&c.attestation_type_out_point, Bytes::from(att_args))
        .expect("attestation type");

    let att_data = encode_attestation(&schema_id, &attester_hash, 1000, r#"{"week":"1"}"#);

    let att_cell = context.create_cell(
        CellOutput::new_builder()
            .capacity(500_000_000u64)
            .lock(subject_lock)
            .type_(Some(att_type).pack())
            .build(),
        att_data,
    );

    let attester_cell = context.create_cell(
        CellOutput::new_builder().capacity(500_000_000u64).lock(attester_lock.clone()).build(),
        Bytes::new(),
    );

    // Revocation: consume attestation cell, no attestation output
    let tx = TransactionBuilder::default()
        .inputs(vec![
            CellInput::new_builder().previous_output(att_cell).build(),
            CellInput::new_builder().previous_output(attester_cell).build(),
        ])
        .output(CellOutput::new_builder().capacity(999_000_000u64).lock(attester_lock).build())
        .output_data(Bytes::new().pack())
        .cell_dep(CellDep::new_builder().out_point(c.always_success_out_point.clone()).build())
        .cell_dep(CellDep::new_builder().out_point(c.attestation_type_out_point.clone()).build())
        .build();
    let tx = context.complete_tx(tx);

    let cycles = context.verify_tx(&tx, 10_000_000).expect("revoke attestation should pass");
    println!("test_revoke_attestation cycles: {}", cycles);
}

/// Subject cannot revoke — should fail
#[test]
fn test_unauthorized_revoke_fails() {
    let mut context = Context::default();
    let c = deploy_contracts(&mut context);

    let attester_lock = always_success_lock(&mut context, &c.always_success_out_point, 1);
    let subject_lock = always_success_lock(&mut context, &c.always_success_out_point, 2);
    let attester_hash = script_hash(&attester_lock);

    let schema_id = fake_hash(10);
    let att_args: Vec<u8> = schema_id.iter().chain(attester_hash.iter()).cloned().collect();

    let att_type = context
        .build_script(&c.attestation_type_out_point, Bytes::from(att_args))
        .expect("attestation type");

    let att_data = encode_attestation(&schema_id, &attester_hash, 1000, r#"{"week":"1"}"#);

    let att_cell = context.create_cell(
        CellOutput::new_builder()
            .capacity(500_000_000u64)
            .lock(subject_lock.clone())
            .type_(Some(att_type).pack())
            .build(),
        att_data,
    );

    let subject_cell = context.create_cell(
        CellOutput::new_builder().capacity(500_000_000u64).lock(subject_lock.clone()).build(),
        Bytes::new(),
    );

    // Subject tries to revoke — should fail
    let tx = TransactionBuilder::default()
        .inputs(vec![
            CellInput::new_builder().previous_output(att_cell).build(),
            CellInput::new_builder().previous_output(subject_cell).build(),
        ])
        .output(CellOutput::new_builder().capacity(999_000_000u64).lock(subject_lock).build())
        .output_data(Bytes::new().pack())
        .cell_dep(CellDep::new_builder().out_point(c.always_success_out_point.clone()).build())
        .cell_dep(CellDep::new_builder().out_point(c.attestation_type_out_point.clone()).build())
        .build();
    let tx = context.complete_tx(tx);

    assert!(context.verify_tx(&tx, 10_000_000).is_err(), "unauthorized revoke should fail");
    println!("test_unauthorized_revoke_fails: correctly rejected");
}

/// Transfer not allowed — should fail
#[test]
fn test_transfer_attestation_fails() {
    let mut context = Context::default();
    let c = deploy_contracts(&mut context);

    let attester_lock = always_success_lock(&mut context, &c.always_success_out_point, 1);
    let subject_lock = always_success_lock(&mut context, &c.always_success_out_point, 2);
    let other_lock = always_success_lock(&mut context, &c.always_success_out_point, 3);
    let attester_hash = script_hash(&attester_lock);

    let schema_id = fake_hash(10);
    let att_args: Vec<u8> = schema_id.iter().chain(attester_hash.iter()).cloned().collect();

    let att_type = context
        .build_script(&c.attestation_type_out_point, Bytes::from(att_args))
        .expect("attestation type");

    let att_data = encode_attestation(&schema_id, &attester_hash, 1000, r#"{"week":"1"}"#);

    let att_cell = context.create_cell(
        CellOutput::new_builder()
            .capacity(500_000_000u64)
            .lock(subject_lock.clone())
            .type_(Some(att_type.clone()).pack())
            .build(),
        att_data.clone(),
    );

    let subject_cell = context.create_cell(
        CellOutput::new_builder().capacity(500_000_000u64).lock(subject_lock).build(),
        Bytes::new(),
    );

    // Try to transfer to another address — should fail
    let tx = TransactionBuilder::default()
        .inputs(vec![
            CellInput::new_builder().previous_output(att_cell).build(),
            CellInput::new_builder().previous_output(subject_cell).build(),
        ])
        .outputs(vec![
            CellOutput::new_builder()
                .capacity(500_000_000u64)
                .lock(other_lock)
                .type_(Some(att_type).pack())
                .build(),
            CellOutput::new_builder().capacity(499_000_000u64).lock(attester_lock).build(),
        ])
        .outputs_data(vec![att_data, Bytes::new()].pack())
        .cell_dep(CellDep::new_builder().out_point(c.always_success_out_point.clone()).build())
        .cell_dep(CellDep::new_builder().out_point(c.attestation_type_out_point.clone()).build())
        .build();
    let tx = context.complete_tx(tx);

    assert!(context.verify_tx(&tx, 10_000_000).is_err(), "transfer should fail");
    println!("test_transfer_attestation_fails: correctly rejected");
}
