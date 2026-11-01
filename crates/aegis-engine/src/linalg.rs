//! Linear Algebra & Polynomial Operations over Finite Field F_{2^31 - 1}
//!
//! Includes:
//! - Cauchy Matrix formulation & properties
//! - Constant-Time Horner's evaluation for secret sharing polynomials
//! - Constant-Time Lagrange interpolation & Dual basis reconstruction

use crate::field::FieldElement;
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

/// A polynomial in F_p[X] with constant-time evaluation
#[derive(Clone, Debug, Serialize, Deserialize, Zeroize)]
pub struct Polynomial {
    #[zeroize(skip)]
    pub degree: usize,
    pub coefficients: Vec<FieldElement>,
}

impl Polynomial {
    /// Construct a new polynomial from coefficients: P(x) = c_0 + c_1*x + ... + c_{k-1}*x^{k-1}
    pub fn new(coefficients: Vec<FieldElement>) -> Self {
        let degree = coefficients.len().saturating_sub(1);
        Self {
            degree,
            coefficients,
        }
    }

    /// Evaluate polynomial at point x in constant-time using Horner's method
    pub fn evaluate_ct(&self, x: FieldElement) -> FieldElement {
        if self.coefficients.is_empty() {
            return FieldElement::ZERO;
        }

        let mut result = *self.coefficients.last().unwrap();
        for coef in self.coefficients.iter().rev().skip(1) {
            result = result * x + *coef;
        }
        result
    }
}

/// A share point (x, y) representing a piece of a secret
#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Zeroize)]
pub struct SharePoint {
    pub x: u32,
    pub y: FieldElement,
}

impl SharePoint {
    pub fn new(x: u32, y: FieldElement) -> Self {
        Self { x, y }
    }
}

/// Reconstruct the secret f(0) from k shares using Constant-Time Lagrange Interpolation
///
/// S = sum_{j=1}^k ( y_j * prod_{m != j} ( -x_m / (x_j - x_m) ) ) mod p
pub fn lagrange_interpolate_at_zero_ct(shares: &[SharePoint]) -> Result<FieldElement, &'static str> {
    let k = shares.len();
    if k == 0 {
        return Err("No shares provided for reconstruction");
    }

    // Verify all x coordinates are distinct
    for i in 0..k {
        for j in (i + 1)..k {
            if shares[i].x == shares[j].x {
                return Err("Duplicate share x-coordinate detected");
            }
        }
    }

    let mut secret = FieldElement::ZERO;

    for j in 0..k {
        let xj = FieldElement::from_u32(shares[j].x);
        let yj = shares[j].y;

        let mut num = FieldElement::ONE;
        let mut den = FieldElement::ONE;

        for m in 0..k {
            if m != j {
                let xm = FieldElement::from_u32(shares[m].x);
                // num *= -xm = (0 - xm)
                num = num * (FieldElement::ZERO - xm);
                // den *= (xj - xm)
                den = den * (xj - xm);
            }
        }

        // Constant-time inversion of denominator
        let den_inv = den.invert_ct();
        let basis_weight = num * den_inv;
        let term = yj * basis_weight;

        secret = secret + term;
    }

    Ok(secret)
}

/// Cauchy Matrix generator: C_{i, j} = 1 / (x_i - y_j) mod p
///
/// Cauchy matrices satisfy the MDS (Maximum Distance Separable) property:
/// Every square submatrix is nonsingular, guaranteeing that any k shares
/// are linearly independent and uniquely determine the secret.
pub struct CauchyMatrix {
    pub rows: usize,
    pub cols: usize,
    pub x: Vec<FieldElement>,
    pub y: Vec<FieldElement>,
}

impl CauchyMatrix {
    pub fn new(x: Vec<FieldElement>, y: Vec<FieldElement>) -> Result<Self, &'static str> {
        let rows = x.len();
        let cols = y.len();

        // Check that all x_i and y_j are mutually disjoint
        for (i, &xi) in x.iter().enumerate() {
            for &yj in &y {
                if xi == yj {
                    return Err("Cauchy matrix parameters x_i and y_j must be disjoint");
                }
            }
            for (j, &xj) in x.iter().enumerate() {
                if i != j && xi == xj {
                    return Err("Cauchy matrix x parameters must be mutually distinct");
                }
            }
        }

        Ok(Self { rows, cols, x, y })
    }

    /// Compute entry C_{i, j} = (x_i - y_j)^(-1) in constant time
    pub fn entry_ct(&self, i: usize, j: usize) -> FieldElement {
        let diff = self.x[i] - self.y[j];
        diff.invert_ct()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_polynomial_evaluation() {
        // P(x) = 5 + 3x + 2x^2
        let poly = Polynomial::new(vec![
            FieldElement::from_u32(5),
            FieldElement::from_u32(3),
            FieldElement::from_u32(2),
        ]);

        // P(0) = 5
        assert_eq!(poly.evaluate_ct(FieldElement::ZERO), FieldElement::from_u32(5));
        // P(1) = 5 + 3(1) + 2(1) = 10
        assert_eq!(poly.evaluate_ct(FieldElement::ONE), FieldElement::from_u32(10));
        // P(2) = 5 + 3(2) + 2(4) = 5 + 6 + 8 = 19
        assert_eq!(poly.evaluate_ct(FieldElement::from_u32(2)), FieldElement::from_u32(19));
    }

    #[test]
    fn test_lagrange_reconstruction() {
        let secret = FieldElement::from_u32(99999);
        let poly = Polynomial::new(vec![
            secret,
            FieldElement::from_u32(1234),
            FieldElement::from_u32(5678),
        ]);

        // 3-of-5 threshold scheme
        let shares = (1..=5)
            .map(|x| SharePoint::new(x, poly.evaluate_ct(FieldElement::from_u32(x))))
            .collect::<Vec<_>>();

        // Reconstruct from any 3 shares
        let subset1 = vec![shares[0], shares[1], shares[2]];
        let subset2 = vec![shares[1], shares[3], shares[4]];
        let subset3 = vec![shares[0], shares[2], shares[4]];

        assert_eq!(lagrange_interpolate_at_zero_ct(&subset1).unwrap(), secret);
        assert_eq!(lagrange_interpolate_at_zero_ct(&subset2).unwrap(), secret);
        assert_eq!(lagrange_interpolate_at_zero_ct(&subset3).unwrap(), secret);
    }
}
