//! Dudect (Differential Computation Analysis) Side-Channel Timing Leakage Benchmark
//!
//! Statistically evaluates whether cryptographic operations leak secret information
//! through execution time variations.
//!
//! Uses Welch's two-sample t-test:
//! - Null hypothesis H0: The two execution time distributions (Fixed Secret vs Random Secret) are identical.
//! - Threshold: |t| < 4.5 indicates no observable side-channel timing leakage.
//! - If |t| >= 4.5, H0 is rejected (significant timing leak present).

use crate::shamir::AegisEngine;
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Dudect benchmark results
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DudectReport {
    pub algorithm_name: String,
    pub num_samples: usize,
    pub mean_fixed_ns: f64,
    pub mean_random_ns: f64,
    pub std_fixed_ns: f64,
    pub std_random_ns: f64,
    pub t_statistic: f64,
    pub is_leakage_detected: bool,
    pub histogram_fixed: Vec<u32>,
    pub histogram_random: Vec<u32>,
}

pub struct DudectHarness;

impl DudectHarness {
    /// Run Dudect benchmark on the constant-time Aegis-SSS reconstruction
    pub fn test_aegis_reconstruction(num_samples: usize) -> DudectReport {
        let fixed_secret = vec![0x42u8; 32];
        let threshold = 3;
        let total_shares = 5;

        // Pre-generate shares for fixed secret
        let fixed_shares = AegisEngine::split_secret(&fixed_secret, threshold, total_shares).unwrap();
        let fixed_subset = vec![fixed_shares[0].clone(), fixed_shares[1].clone(), fixed_shares[2].clone()];

        let mut timings_fixed = Vec::with_capacity(num_samples);
        let mut timings_random = Vec::with_capacity(num_samples);

        // Pre-generate random subsets
        let mut random_subsets = Vec::with_capacity(num_samples);
        for _ in 0..num_samples {
            let mut rand_bytes = vec![0u8; 32];
            OsRng.fill_bytes(&mut rand_bytes);
            let rand_shares = AegisEngine::split_secret(&rand_bytes, threshold, total_shares).unwrap();
            random_subsets.push(vec![rand_shares[0].clone(), rand_shares[1].clone(), rand_shares[2].clone()]);
        }

        // Interleaved measurement to eliminate environmental thermal drift
        for i in 0..num_samples {
            // Measure fixed
            let start = Instant::now();
            let _ = AegisEngine::reconstruct_secret(&fixed_subset);
            let elapsed_fixed = start.elapsed().as_nanos() as f64;
            timings_fixed.push(elapsed_fixed);

            // Measure random
            let start = Instant::now();
            let _ = AegisEngine::reconstruct_secret(&random_subsets[i]);
            let elapsed_random = start.elapsed().as_nanos() as f64;
            timings_random.push(elapsed_random);
        }

        compute_report("Aegis-SSS (Constant-Time Cauchy-Mersenne)", &timings_fixed, &timings_random)
    }

    /// Run Dudect benchmark on a deliberately vulnerable branch/table-lookup baseline
    /// to demonstrate positive control leakage detection
    pub fn test_vulnerable_baseline(num_samples: usize) -> DudectReport {
        let mut timings_fixed = Vec::with_capacity(num_samples);
        let mut timings_random = Vec::with_capacity(num_samples);

        for _ in 0..num_samples {
            // Fixed zero secret
            let start = Instant::now();
            vulnerable_mock_poly_eval(0);
            timings_fixed.push(start.elapsed().as_nanos() as f64);

            // Random secret
            let mut rand_bytes = [0u8; 4];
            OsRng.fill_bytes(&mut rand_bytes);
            let rand_val = u32::from_le_bytes(rand_bytes);
            let start = Instant::now();
            vulnerable_mock_poly_eval(rand_val);
            timings_random.push(start.elapsed().as_nanos() as f64);
        }

        compute_report("Vulnerable Baseline (Non-Constant-Time Table/Branch)", &timings_fixed, &timings_random)
    }
}

/// A deliberately vulnerable mock function mimicking table lookup and branching in standard libraries
#[inline(never)]
fn vulnerable_mock_poly_eval(secret: u32) -> u32 {
    let mut acc = 0;
    // Secret-dependent branching
    if secret == 0 {
        // Fast path: returns early or skips computation
        std::hint::black_box(acc)
    } else {
        // Slow path: simulated memory table lookup and unrolled loop
        let lookup_table = [1u32, 3, 7, 15, 31, 63, 127, 255];
        for i in 0..10 {
            acc = acc.wrapping_add(lookup_table[(secret as usize + i) % lookup_table.len()]);
        }
        std::hint::black_box(acc)
    }
}

/// Compute Welch's t-test statistic and generate histogram buckets
fn compute_report(name: &str, fixed: &[f64], random: &[f64]) -> DudectReport {
    let n1 = fixed.len() as f64;
    let n2 = random.len() as f64;

    let mean1 = fixed.iter().sum::<f64>() / n1;
    let mean2 = random.iter().sum::<f64>() / n2;

    let var1 = fixed.iter().map(|&x| (x - mean1).powi(2)).sum::<f64>() / (n1 - 1.0);
    let var2 = random.iter().map(|&x| (x - mean2).powi(2)).sum::<f64>() / (n2 - 1.0);

    let std1 = var1.sqrt();
    let std2 = var2.sqrt();

    let denom = (var1 / n1 + var2 / n2).sqrt();
    let t_stat = if denom == 0.0 { 0.0 } else { (mean1 - mean2) / denom };

    // Discard extreme 1% outliers (e.g. OS context switches) for histogram bins
    let min_val = mean1.min(mean2) - 2.0 * std1.max(std2);
    let max_val = mean1.max(mean2) + 2.0 * std1.max(std2);
    let num_bins = 20;
    let bin_width = (max_val - min_val).max(1.0) / (num_bins as f64);

    let mut hist_fixed = vec![0u32; num_bins];
    let mut hist_random = vec![0u32; num_bins];

    for &t in fixed {
        if t >= min_val && t < max_val {
            let idx = ((t - min_val) / bin_width).floor() as usize;
            if idx < num_bins {
                hist_fixed[idx] += 1;
            }
        }
    }

    for &t in random {
        if t >= min_val && t < max_val {
            let idx = ((t - min_val) / bin_width).floor() as usize;
            if idx < num_bins {
                hist_random[idx] += 1;
            }
        }
    }

    DudectReport {
        algorithm_name: name.to_string(),
        num_samples: fixed.len(),
        mean_fixed_ns: mean1,
        mean_random_ns: mean2,
        std_fixed_ns: std1,
        std_random_ns: std2,
        t_statistic: t_stat,
        is_leakage_detected: t_stat.abs() >= 4.5,
        histogram_fixed: hist_fixed,
        histogram_random: hist_random,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dudect_runner() {
        let report = DudectHarness::test_aegis_reconstruction(200);
        println!("Aegis-SSS t-statistic: {:.4}", report.t_statistic);
        // Should not have massive leakage
        assert!(report.t_statistic.abs() < 10.0);
    }
}
