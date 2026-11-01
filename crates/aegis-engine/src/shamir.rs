//! High-Level Secret Sharing API for Arbitrary Byte Strings (API Master Keys)
//!
//! Features:
//! - Limb decomposition (30-bit limbs to strictly prevent field overflow in F_{2^31-1})
//! - Constant-time Cauchy-Lagrange polynomial sharing
//! - Automatic memory scrubbing via `Zeroize`
//! - Safe serializable share format

use crate::field::{FieldElement, P};
use crate::linalg::{lagrange_interpolate_at_zero_ct, Polynomial, SharePoint};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Error, Debug)]
pub enum AegisError {
    #[error("Invalid threshold: k ({threshold}) must be >= 2 and <= n ({total_shares})")]
    InvalidThreshold { threshold: usize, total_shares: usize },
    #[error("Insufficient shares for reconstruction: received {received}, required {required}")]
    InsufficientShares { received: usize, required: usize },
    #[error("Corrupt or invalid share payload: {0}")]
    CorruptShare(String),
    #[error("Lagrange interpolation error: {0}")]
    InterpolationError(&'static str),
}

/// An individual share distributed to a participant or storage enclave
#[derive(Clone, Debug, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct SecretShare {
    pub share_id: u32,
    pub threshold: u32,
    pub total_shares: u32,
    pub limbs: Vec<FieldElement>,
}

impl SecretShare {
    /// Format share as a portable encoded string: `AEGIS-<threshold>-<share_id>-<hex>`
    pub fn to_encoded_string(&self) -> String {
        let mut hex_parts = Vec::with_capacity(self.limbs.len());
        for limb in &self.limbs {
            hex_parts.push(format!("{:08x}", limb.to_u32()));
        }
        format!(
            "AEGIS-{}-{}-{}",
            self.threshold,
            self.share_id,
            hex_parts.join("")
        )
    }

    /// Parse an encoded share string
    pub fn from_encoded_string(encoded: &str) -> Result<Self, AegisError> {
        let parts: Vec<&str> = encoded.trim().split('-').collect();
        if parts.len() != 4 || parts[0] != "AEGIS" {
            return Err(AegisError::CorruptShare(
                "Invalid Aegis share format header".to_string(),
            ));
        }

        let threshold = parts[1]
            .parse::<u32>()
            .map_err(|_| AegisError::CorruptShare("Invalid threshold integer".to_string()))?;
        let share_id = parts[2]
            .parse::<u32>()
            .map_err(|_| AegisError::CorruptShare("Invalid share_id integer".to_string()))?;

        let hex_body = parts[3];
        if hex_body.len() % 8 != 0 {
            return Err(AegisError::CorruptShare(
                "Hex payload length must be a multiple of 8".to_string(),
            ));
        }

        let mut limbs = Vec::new();
        for chunk in hex_body.as_bytes().chunks(8) {
            let chunk_str = std::str::from_utf8(chunk)
                .map_err(|e| AegisError::CorruptShare(e.to_string()))?;
            let val = u32::from_str_radix(chunk_str, 16)
                .map_err(|e| AegisError::CorruptShare(e.to_string()))?;
            limbs.push(FieldElement::from_u32(val));
        }

        Ok(Self {
            share_id,
            threshold,
            total_shares: 0,
            limbs,
        })
    }
}

/// Constant-Time Secret Sharing Engine
pub struct AegisEngine;

impl AegisEngine {
    /// Split a master secret key into n shares with a threshold of k
    pub fn split_secret(
        secret: &[u8],
        threshold: usize,
        total_shares: usize,
    ) -> Result<Vec<SecretShare>, AegisError> {
        if threshold < 2 || threshold > total_shares {
            return Err(AegisError::InvalidThreshold {
                threshold,
                total_shares,
            });
        }

        // Decompose secret bytes into 30-bit limbs
        let limbs = bytes_to_limbs(secret);

        // Pre-allocate shares
        let mut shares: Vec<SecretShare> = (1..=total_shares)
            .map(|id| SecretShare {
                share_id: id as u32,
                threshold: threshold as u32,
                total_shares: total_shares as u32,
                limbs: Vec::with_capacity(limbs.len()),
            })
            .collect();

        // For each limb, generate a random polynomial P(x) of degree threshold - 1 with P(0) = limb
        for &secret_limb in &limbs {
            let mut coefficients = Vec::with_capacity(threshold);
            coefficients.push(secret_limb);

            // Generate (threshold - 1) random coefficients in [0, P-1]
            for _ in 1..threshold {
                let mut rand_bytes = [0u8; 4];
                OsRng.fill_bytes(&mut rand_bytes);
                let rand_val = (u32::from_le_bytes(rand_bytes) as u64) % P;
                coefficients.push(FieldElement::from_u32(rand_val as u32));
            }

            let poly = Polynomial::new(coefficients);

            // Evaluate polynomial at points 1..=total_shares in constant time
            for (idx, share) in shares.iter_mut().enumerate() {
                let x = (idx + 1) as u32;
                let y = poly.evaluate_ct(FieldElement::from_u32(x));
                share.limbs.push(y);
            }
        }

        Ok(shares)
    }

    /// Reconstruct the master secret key from any subset of >= k shares
    pub fn reconstruct_secret(shares: &[SecretShare]) -> Result<Vec<u8>, AegisError> {
        if shares.is_empty() {
            return Err(AegisError::InsufficientShares {
                received: 0,
                required: 2,
            });
        }

        let threshold = shares[0].threshold as usize;
        if shares.len() < threshold {
            return Err(AegisError::InsufficientShares {
                received: shares.len(),
                required: threshold,
            });
        }

        let num_limbs = shares[0].limbs.len();
        for s in shares {
            if s.limbs.len() != num_limbs {
                return Err(AegisError::CorruptShare(
                    "Mismatched limb count across shares".to_string(),
                ));
            }
        }

        // Reconstruct each limb in constant time
        let mut reconstructed_limbs = Vec::with_capacity(num_limbs);
        for limb_idx in 0..num_limbs {
            let points: Vec<SharePoint> = shares
                .iter()
                .take(threshold)
                .map(|s| SharePoint::new(s.share_id, s.limbs[limb_idx]))
                .collect();

            let limb = lagrange_interpolate_at_zero_ct(&points)
                .map_err(AegisError::InterpolationError)?;
            reconstructed_limbs.push(limb);
        }

        // Assemble limbs back into byte array
        let secret = limbs_to_bytes(&reconstructed_limbs);
        Ok(secret)
    }
}

/// Convert arbitrary byte string into 30-bit limbs
/// We append a 4-byte big-endian original length header so padding is cleanly stripped.
fn bytes_to_limbs(data: &[u8]) -> Vec<FieldElement> {
    let mut payload = Vec::with_capacity(4 + data.len());
    payload.extend_from_slice(&(data.len() as u32).to_be_bytes());
    payload.extend_from_slice(data);

    let mut limbs = Vec::new();
    let mut current_limb: u64 = 0;
    let mut bits_in_limb = 0;

    for &byte in &payload {
        current_limb |= (byte as u64) << bits_in_limb;
        bits_in_limb += 8;

        while bits_in_limb >= 30 {
            let limb_val = (current_limb & 0x3FFF_FFFF) as u32;
            limbs.push(FieldElement::from_u32(limb_val));
            current_limb >>= 30;
            bits_in_limb -= 30;
        }
    }

    if bits_in_limb > 0 {
        let limb_val = (current_limb & 0x3FFF_FFFF) as u32;
        limbs.push(FieldElement::from_u32(limb_val));
    }

    limbs
}

/// Reconstruct bytes from 30-bit limbs
fn limbs_to_bytes(limbs: &[FieldElement]) -> Vec<u8> {
    let mut raw_bytes = Vec::new();
    let mut bit_buf: u64 = 0;
    let mut bits_in_buf = 0;

    for limb in limbs {
        bit_buf |= (limb.to_u32() as u64) << bits_in_buf;
        bits_in_buf += 30;

        while bits_in_buf >= 8 {
            raw_bytes.push((bit_buf & 0xFF) as u8);
            bit_buf >>= 8;
            bits_in_buf -= 8;
        }
    }

    if raw_bytes.len() < 4 {
        return Vec::new();
    }

    let orig_len = u32::from_be_bytes([raw_bytes[0], raw_bytes[1], raw_bytes[2], raw_bytes[3]]) as usize;
    let actual_data = &raw_bytes[4..];

    if orig_len <= actual_data.len() {
        actual_data[..orig_len].to_vec()
    } else {
        actual_data.to_vec()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_master_key_split_and_recover() {
        let master_key = b"sk-proj-aegis_master_secret_api_key_42x99_enterprise";
        let threshold = 3;
        let total_shares = 5;

        let shares = AegisEngine::split_secret(master_key, threshold, total_shares).unwrap();
        assert_eq!(shares.len(), 5);

        // Recover with exact threshold
        let subset = vec![shares[0].clone(), shares[2].clone(), shares[4].clone()];
        let recovered = AegisEngine::reconstruct_secret(&subset).unwrap();
        assert_eq!(recovered, master_key);

        // Recover with different subset
        let subset2 = vec![shares[1].clone(), shares[2].clone(), shares[3].clone()];
        let recovered2 = AegisEngine::reconstruct_secret(&subset2).unwrap();
        assert_eq!(recovered2, master_key);
    }

    #[test]
    fn test_encoded_string_roundtrip() {
        let master_key = b"OpenAI_Super_Secret_Master_Key";
        let shares = AegisEngine::split_secret(master_key, 2, 3).unwrap();

        let encoded = shares[0].to_encoded_string();
        assert!(encoded.starts_with("AEGIS-2-1-"));

        let parsed = SecretShare::from_encoded_string(&encoded).unwrap();
        assert_eq!(parsed.share_id, 1);
        assert_eq!(parsed.threshold, 2);
        assert_eq!(parsed.limbs, shares[0].limbs);
    }

    #[test]
    fn test_insufficient_shares_fails() {
        let master_key = b"key_under_threshold";
        let shares = AegisEngine::split_secret(master_key, 4, 6).unwrap();

        let insufficient = vec![shares[0].clone(), shares[1].clone(), shares[2].clone()];
        let res = AegisEngine::reconstruct_secret(&insufficient);
        assert!(res.is_err());
    }
}
