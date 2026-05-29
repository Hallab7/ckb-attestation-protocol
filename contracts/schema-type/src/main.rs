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

// Schema cell data layout:
// [name_len: 2 LE][name: n][desc_len: 2 LE][desc: m][fields_len: 2 LE][fields_json: k]
pub const SCHEMA_MIN_DATA_LEN: usize = 6; // 3 x 2-byte length fields minimum

// Script args: [attester_lock_hash: 32]
pub const SCHEMA_ARGS_LEN: usize = 32;

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
    match verify_schema() {
        Ok(_) => 0,
        Err(e) => e as i8,
    }
}

fn verify_schema() -> Result<(), Error> {
    let script = load_script().map_err(Error::from)?;
    let args: Bytes = script.args().unpack();

    if args.len() != SCHEMA_ARGS_LEN {
        return Err(Error::InvalidArgs);
    }

    let attester_lock_hash = &args[0..32];

    // Determine operation: creation vs update
    match load_cell_data(0, Source::GroupInput) {
        Err(ckb_std::error::SysError::IndexOutOfBound) => {
            // Creation — no input group cell
            let output_data = load_cell_data(0, Source::GroupOutput).map_err(Error::from)?;
            validate_schema_data(&output_data)?;
            Ok(())
        }
        Ok(_) => {
            // Update — input exists, verify attester signed
            verify_signed_by(attester_lock_hash)?;
            let output_data = load_cell_data(0, Source::GroupOutput).map_err(Error::from)?;
            validate_schema_data(&output_data)?;
            Ok(())
        }
        Err(e) => Err(Error::from(e)),
    }
}

/// Validate schema cell data layout:
/// [name_len: 2 LE][name: n][desc_len: 2 LE][desc: m][fields_len: 2 LE][fields_json: k]
fn validate_schema_data(data: &[u8]) -> Result<(), Error> {
    if data.len() < SCHEMA_MIN_DATA_LEN {
        return Err(Error::InvalidDataLength);
    }

    let mut offset = 0usize;

    // name
    let name_len = u16::from_le_bytes([data[offset], data[offset + 1]]) as usize;
    offset += 2;
    if name_len == 0 || data.len() < offset + name_len {
        return Err(Error::InvalidData);
    }
    offset += name_len;

    // description
    if data.len() < offset + 2 {
        return Err(Error::InvalidDataLength);
    }
    let desc_len = u16::from_le_bytes([data[offset], data[offset + 1]]) as usize;
    offset += 2;
    if data.len() < offset + desc_len {
        return Err(Error::InvalidData);
    }
    offset += desc_len;

    // fields_json
    if data.len() < offset + 2 {
        return Err(Error::InvalidDataLength);
    }
    let fields_len = u16::from_le_bytes([data[offset], data[offset + 1]]) as usize;
    offset += 2;
    if data.len() < offset + fields_len {
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
