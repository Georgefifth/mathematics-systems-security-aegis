//! Aegis-Engine: Side-Channel Resistant Constant-Time Cauchy-Mersenne Secret Sharing
//!
//! Provides:
//! - `field`: Mersenne finite field F_{2^31 - 1} with branchless Montgomery arithmetic
//! - `linalg`: Cauchy matrix operations & constant-time Lagrange interpolation
//! - `shamir`: High-level threshold secret sharing for master keys & zeroize integration
//! - `dudect`: Statistical side-channel timing analysis harness

pub mod dudect;
pub mod field;
pub mod linalg;
pub mod shamir;

pub use dudect::{DudectHarness, DudectReport};
pub use field::{FieldElement, P};
pub use linalg::{CauchyMatrix, Polynomial, SharePoint};
pub use shamir::{AegisEngine, AegisError, SecretShare};
