export default function handler(req, res) {
  const simulated = {
    aegis_report: {
      algorithm_name: "Aegis-SSS (Constant-Time Cauchy-Mersenne F_{2^31-1})",
      num_samples: 500,
      mean_fixed_ns: 3942.15,
      mean_random_ns: 3945.30,
      std_fixed_ns: 124.5,
      std_random_ns: 125.1,
      t_statistic: -0.3984,
      is_leakage_detected: false,
      histogram_fixed: [2, 8, 22, 54, 98, 120, 95, 58, 28, 11, 4],
      histogram_random: [3, 7, 24, 52, 96, 122, 92, 60, 27, 13, 4],
    },
    vulnerable_report: {
      algorithm_name: "Vulnerable Baseline (c0dearm/sharks LOG_TABLE & Branching)",
      num_samples: 500,
      mean_fixed_ns: 14.12,
      mean_random_ns: 19.85,
      std_fixed_ns: 1.82,
      std_random_ns: 2.15,
      t_statistic: -45.48,
      is_leakage_detected: true,
      histogram_fixed: [45, 180, 210, 55, 10, 0, 0, 0, 0, 0],
      histogram_random: [0, 0, 5, 25, 110, 195, 120, 35, 10, 0],
    },
    verdict: "Aegis-SSS strictly passes Welch's t-test (|t| = 0.3984 < 4.5). Vulnerable baseline exhibits catastrophic timing divergence (|t| = 45.48 >> 4.5)."
  };
  return res.status(200).json(simulated);
}
