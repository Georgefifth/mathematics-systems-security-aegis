# QA Test Scenarios — AegisAgent

## Priority Matrix

| Scenario ID | Name | Priority | Description | Acceptance Criteria |
|---|---|---|---|---|
| `enclave-shred` | Master Key Shredding | **P0** | Ingest master API key and generate $(k, n)$ polynomial shares over Mersenne Field $\mathbb{F}_{2^{31}-1}$ | Generates exactly $n$ valid shares; raw key cleared from active input/state |
| `enclave-reconstruct` | Lagrange Reconstruction | **P0** | Select $k$ shares and perform constant-time dual-basis interpolation | Reconstructed key matches original master key bit-for-bit |
| `sidechannel-audit` | Dudect Side-Channel Verification | **P0** | Run Welch's $t$-test timing analysis | Aegis-SSS exhibits $\|t\| < 4.5$ (Pass); Vulnerable baseline fails |
| `agent-blind-infer` | Confidential AI Agent Pipeline | **P0** | Submit query with sensitive tokens to AI agent | Tokens blinded before cloud transmission; master key exposure = 0 bytes |
| `attack-defense` | Prompt Injection Defense | **P1** | Simulate adversarial prompt injection attempting key dump | Enclave intercepts attack; raw key remains strictly isolated |
| `invalid-input` | Threshold Bounds Validation | **P1** | Set invalid threshold $k > n$ or empty input | Clear inline error message displayed; invalid submission blocked |
| `responsive-layout` | Mobile 390px Adaptation | **P1** | Test on 390×844 mobile viewport | Zero horizontal overflow; touch targets $\ge 44$px |
| `latex-specs` | Cryptographer Track LaTeX Specs | **P2** | View mathematical specification and proofs | Formulas, Mersenne field equations, and Cauchy theorems render cleanly |
