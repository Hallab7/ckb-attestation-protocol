#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(any(feature = "library", test))]
extern crate alloc;

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);
#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, prelude::*},
    high_level::{load_cell_data, load_cell_lock_hash, load_script},
};

// Attestation cell data layout:
// [schema_id: 32][attester_lock_hash: 32][issued_at: 8 LE u64][data_len: 2 LE][data_json: n]
pub const ATT_SCHEMA_ID_OFFSET: usize = 0;
pub const ATT_ATTESTER_HASH_OFFSET: usize = 32;
pub const ATT_ISSUED_AT_OFFSET: usize = 64;
pub const ATT_DATA_LEN_OFFSET: usize = 72;
pub const ATT_DATA_OFFSET: usize = 74;
pub const ATT_MIN_DATA_LEN: usize = 74;

// Script args: [schema_id: 32][attester_lock_hash: 32]
pub const ATT_ARGS_LEN: usize = 64;

#[repr(i8)]
enum Error {
    IndexOutOfBound = 1,
    ItemMissing,
    LengthNotEnough,
    Encoding,
    InvalidArgs,
    InvalidDataLength,
    InvalidData,
    Unauthorized,
    TransferNotAllowed,
}

impl From<ckb_std::error::SysError> for Error {
    fn from(err: ckb_std::error::SysError) -> Self {
        use ckb_std::error::SysError::*;
        match err {
            IndexOutOfBound => Self::IndexOutOfBound,
            ItemMissing => Self::ItemMissing,
            LengthNotEnough(_) => Self::LengthNotEnough,
            Encoding => Self::Encoding,
            _ => Self::Encoding,
        }
    }
}

pub fn program_entry() -> i8 {
    match verify_attestation() {
        Ok(_) => 0,
        Err(e) => e as i8,
    }
}

fn verify_attestation() -> Result<(), Error> {
    let script = load_script().map_err(Error::from)?;
    let args: Bytes = script.args().unpack();

    if args.len() != ATT_ARGS_LEN {
        return Err(Error::InvalidArgs);
    }

    let _schema_id = &args[0..32];
    let attester_lock_hash = &args[32..64];

    let has_input = load_cell_data(0, Source::GroupInput).is_ok();
    let has_output = load_cell_data(0, Source::GroupOutput).is_ok();

    match (has_input, has_output) {
        // Creation: no input, output exists
        (false, true) => {
            let output_data = load_cell_data(0, Source::GroupOutput).map_err(Error::from)?;
            validate_attestation_data(&output_data, attester_lock_hash)?;
            // Attester must sign the issuance
            verify_signed_by(attester_lock_hash)?;
            Ok(())
        }

        // Revocation: input exists, no output
        (true, false) => {
            let input_data = load_cell_data(0, Source::GroupInput).map_err(Error::from)?;
            if input_data.len() < ATT_MIN_DATA_LEN {
                return Err(Error::InvalidDataLength);
            }
            // Read attester lock hash from cell data (not args, in case args differ)
            let stored_attester = &input_data[ATT_ATTESTER_HASH_OFFSET..ATT_ATTESTER_HASH_OFFSET + 32];
            verify_signed_by(stored_attester)?;
            Ok(())
        }

        // Transfer: input and output both exist — not allowed
        (true, true) => Err(Error::TransferNotAllowed),

        // Neither — shouldn't happen
        (false, false) => Err(Error::InvalidData),
    }
}

fn validate_attestation_data(data: &[u8], expected_attester: &[u8]) -> Result<(), Error> {
    if data.len() < ATT_MIN_DATA_LEN {
        return Err(Error::InvalidDataLength);
    }

    // Verify attester_lock_hash in data matches script args
    let stored_attester = &data[ATT_ATTESTER_HASH_OFFSET..ATT_ATTESTER_HASH_OFFSET + 32];
    if stored_attester != expected_attester {
        return Err(Error::Unauthorized);
    }

    // Verify data_json length is consistent
    let data_len = u16::from_le_bytes([data[ATT_DATA_LEN_OFFSET], data[ATT_DATA_LEN_OFFSET + 1]]) as usize;
    if data.len() < ATT_DATA_OFFSET + data_len {
        return Err(Error::InvalidData);
    }

    Ok(())
}

fn verify_signed_by(expected_lock_hash: &[u8]) -> Result<(), Error> {
    let mut i = 0;
    loop {
        match load_cell_lock_hash(i, Source::Input) {
            Ok(lock_hash) => {
                if lock_hash == expected_lock_hash {
                    return Ok(());
                }
            }
            Err(ckb_std::error::SysError::IndexOutOfBound) => break,
            Err(e) => return Err(Error::from(e)),
        }
        i += 1;
    }
    Err(Error::Unauthorized)
}
