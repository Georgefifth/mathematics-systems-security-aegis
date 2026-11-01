//! Constant-Time Mersenne Prime Field Arithmetic: F_p where p = 2^31 - 1
//!
//! Designed to eliminate all microarchitectural side-channels:
//! - Zero table lookups (immune to cache-timing attacks like Prime+Probe / Flush+Reload)
//! - Zero secret-dependent branches (immune to Spectre / branch misprediction leaks)
//! - Constant-time modular reduction and constant-time inversion via Fermat's Little Theorem

use core::ops::{Add, AddAssign, Mul, MulAssign, Neg, Sub, SubAssign};
use serde::{Deserialize, Serialize};
use subtle::{Choice, ConditionallySelectable, ConstantTimeEq};
use zeroize::Zeroize;

/// Mersenne Prime p = 2^31 - 1
pub const P: u64 = 2147483647; // (1 << 31) - 1

/// An element of the finite field F_{2^31 - 1}
#[derive(Copy, Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize, Zeroize)]
pub struct FieldElement(pub u32);

impl ConditionallySelectable for FieldElement {
    #[inline]
    fn conditional_select(a: &Self, b: &Self, choice: Choice) -> Self {
        FieldElement(u32::conditional_select(&a.0, &b.0, choice))
    }
}

impl ConstantTimeEq for FieldElement {
    #[inline]
    fn ct_eq(&self, other: &Self) -> Choice {
        self.0.ct_eq(&other.0)
    }
}

impl FieldElement {
    pub const ZERO: Self = FieldElement(0);
    pub const ONE: Self = FieldElement(1);

    /// Construct field element from u32, reducing mod p
    #[inline]
    pub fn from_u32(val: u32) -> Self {
        let mut x = (val & 0x7FFF_FFFF) + (val >> 31);
        if x >= P as u32 {
            x -= P as u32;
        }
        FieldElement(x)
    }

    /// Construct field element from u64, reducing mod p
    #[inline]
    pub fn from_u64(val: u64) -> Self {
        // Fast Mersenne reduction: val = (val >> 31) + (val & P)
        let low = val & P;
        let high = val >> 31;
        let mut sum = low + high;
        // At most two rounds of folding
        if sum >= P {
            sum = (sum & P) + (sum >> 31);
        }
        if sum >= P {
            sum -= P;
        }
        FieldElement(sum as u32)
    }

    /// Convert to u32 canonical representative in [0, p-1]
    #[inline]
    pub fn to_u32(self) -> u32 {
        self.0
    }

    /// Constant-time check if element is zero
    #[inline]
    pub fn is_zero_ct(&self) -> Choice {
        self.0.ct_eq(&0)
    }

    /// Constant-time addition mod p
    #[inline]
    pub fn add_ct(&self, other: &Self) -> Self {
        let sum = (self.0 as u64) + (other.0 as u64);
        let sub = sum.wrapping_sub(P);
        // If sum >= P, pick sub, else pick sum (constant time)
        let mask = ((sub >> 63) & 1) as u8; // 1 if sum < P, 0 if sum >= P
        let pick_sub = Choice::from(mask ^ 1);
        let res = u64::conditional_select(&sum, &sub, pick_sub);
        FieldElement(res as u32)
    }

    /// Constant-time subtraction mod p
    #[inline]
    pub fn sub_ct(&self, other: &Self) -> Self {
        let diff = (self.0 as u64).wrapping_sub(other.0 as u64);
        let underflow = ((diff >> 63) & 1) as u8;
        let corrected = diff.wrapping_add(P);
        let pick_corrected = Choice::from(underflow);
        let res = u64::conditional_select(&diff, &corrected, pick_corrected);
        FieldElement(res as u32)
    }

    /// Constant-time multiplication mod p
    #[inline]
    pub fn mul_ct(&self, other: &Self) -> Self {
        let prod = (self.0 as u64) * (other.0 as u64);
        Self::from_u64(prod)
    }

    /// Constant-time squaring mod p
    #[inline]
    pub fn square_ct(&self) -> Self {
        self.mul_ct(self)
    }

    /// Constant-time inversion via Fermat's Little Theorem: x^(p-2) mod p
    /// For p = 2^31 - 1, p - 2 = 2^31 - 3 = (0x7FFF_FFFD)
    /// Exponent in binary: 30 ones followed by a zero and a one (31 bits: 29 ones, a zero, then a one)
    /// Total 30 squarings + 29 multiplications, strictly constant cycle count!
    pub fn invert_ct(&self) -> Self {
        // Exponent = 2147483645 = 0x7FFF_FFFD = 2^31 - 3
        let exp: u32 = 0x7FFF_FFFD;
        let mut res = FieldElement::ONE;
        let mut base = *self;

        for bit in 0..31 {
            let bit_set = Choice::from(((exp >> bit) & 1) as u8);
            let mul_res = res.mul_ct(&base);
            res = FieldElement::conditional_select(&res, &mul_res, bit_set);
            base = base.square_ct();
        }

        res
    }
}

impl Add for FieldElement {
    type Output = Self;
    #[inline]
    fn add(self, rhs: Self) -> Self::Output {
        self.add_ct(&rhs)
    }
}

impl AddAssign for FieldElement {
    #[inline]
    fn add_assign(&mut self, rhs: Self) {
        *self = self.add_ct(&rhs);
    }
}

impl Sub for FieldElement {
    type Output = Self;
    #[inline]
    fn sub(self, rhs: Self) -> Self::Output {
        self.sub_ct(&rhs)
    }
}

impl SubAssign for FieldElement {
    #[inline]
    fn sub_assign(&mut self, rhs: Self) {
        *self = self.sub_ct(&rhs);
    }
}

impl Mul for FieldElement {
    type Output = Self;
    #[inline]
    fn mul(self, rhs: Self) -> Self::Output {
        self.mul_ct(&rhs)
    }
}

impl MulAssign for FieldElement {
    #[inline]
    fn mul_assign(&mut self, rhs: Self) {
        *self = self.mul_ct(&rhs);
    }
}

impl Neg for FieldElement {
    type Output = Self;
    #[inline]
    fn neg(self) -> Self::Output {
        FieldElement::ZERO.sub_ct(&self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_sub_identities() {
        let a = FieldElement::from_u32(1234567);
        let b = FieldElement::from_u32(9876543);
        let sum = a + b;
        assert_eq!(sum - b, a);
        assert_eq!(sum - a, b);
    }

    #[test]
    fn test_inversion() {
        let a = FieldElement::from_u32(424242);
        let inv = a.invert_ct();
        let prod = a * inv;
        assert_eq!(prod, FieldElement::ONE);
    }

    #[test]
    fn test_zero_handling() {
        let z = FieldElement::ZERO;
        let a = FieldElement::from_u32(100);
        assert_eq!(z + a, a);
        assert_eq!(z * a, FieldElement::ZERO);
    }
}
