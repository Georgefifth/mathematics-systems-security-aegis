# UX Contract — AegisAgent

> Fill this before writing UI code. It is the acceptance contract for the
> frontend: if the implementation does not match this file, the implementation
> is wrong. Keep it short and specific.

## 1. Product

- **One-liner**: Side-Channel Resistant Zero-Knowledge Secret-Shared Enclave & Privacy Gateway for Autonomous AI Agents.
- **Primary user**: AI security engineers, cryptographers, and enterprise developers deploying autonomous agents with high-value API master keys.
- **Job to be done**: Prevent AI agents and cloud host providers from exposing Master API Keys and sensitive inputs via prompt injection or microarchitectural side-channels.
- **Core success action**: Split an API master key into constant-time Cauchy-polynomial shares, dispatch an encrypted prompt through the agent pipeline, and execute an isolated LLM inference with zero master key leakage.
- **What the user should never have to guess**:
  1. The exact mathematical state of their master key (split into $(k, n)$ threshold shares vs reconstructed transiently).
  2. Whether their LLM agent prompt was encrypted before egressing to the host provider.
  3. Whether the cryptographic execution is genuinely constant-time (verified via live Dudect $t$-statistic).

## 2. Core flow

| # | Step | User action | System feedback | Next step is obvious? |
|---|---|---|---|---|
| 1 | Key Ingestion & Threshold Setup | Enter Master API Key and select $(k, n)$ threshold (e.g. 3-of-5) | Master key is immediately shredded into $(k, n)$ polynomial shares in constant-time; raw key wiped from memory | Yes: Proceed to Side-Channel Verification or Agent Pipeline |
| 2 | Side-Channel & Mathematical Audit | Click "Run Side-Channel Analysis" | Live Dudect timing histogram renders; displays $t$-statistic ($|t| < 4.5$ indicating zero leakage vs Sharks table-lookup failure) | Yes: Proceed to Protected Agent Sandbox |
| 3 | Blind AI Agent Execution | Type prompt with sensitive entity/key and click "Execute Blind Inference" | Split-view shows: (a) Encrypted token payload sent to LLM provider, (b) Transient key synthesis ($< 5\mu s$), (c) Decrypted response on loopback | Yes: Core mission accomplished, inspection telemetry displayed |

Target: ≤ 3 steps and ≤ 1 minute from landing to the core result.

## 3. Pages

| Page / Tab | Purpose | Primary action | Secondary actions |
|---|---|---|---|
| `/enclave` (Enclave Vault) | Ingest master keys, configure $(k, n)$ thresholds, and monitor memory zeroization | Ingest & Shred Master Key | Inspect polynomial coefficients, export shares |
| `/audit` (Crypto Analysis) | Side-channel timing verification and mathematical proof viewer | Run Dudect Timing Benchmark | Toggle comparative benchmark against `c0dearm/sharks` |
| `/pipeline` (Agent Gateway) | Real-time AI agent prompt encryption and sandboxed inference execution | Execute Blind Inference | Toggle Mock LLM / Real OpenAI & Gemini API, simulate Prompt Injection attack |

One primary action per page/view. Clear tab switcher at the top navigation.

## 4. Required states

For every page and interactive component:

- [x] **Empty / first visit**: Explains that no master key is loaded in memory; guides user to generate or enter a key to activate the enclave.
- [x] **Loading**: Real-time terminal status pulse and animated telemetry progress; no dead UI or unclickable frozen states.
- [x] **Success**: Clear confirmation badge ("Enclave Secured: $(3, 5)$ Shares Active", "Leakage Free: $t = 0.42 < 4.5$").
- [x] **Error**: Clear error message explaining cryptographic validation failure or API timeout with immediate retry button.
- [x] **Invalid input**: Direct inline indicator on threshold configuration ($k > n$ prohibited, key format validation).
- [x] **No permission / signed out**: Not applicable (local-first loopback architecture with zero-trust local enclave).
- [x] **Mobile 390px layout**: Stacked responsive view, single-column cards, full touch target reachability.

## 5. Design tokens

- **Font family and scale**:
  - Primary UI & Headers: `JetBrains Mono`, `IBM Plex Mono`, monospace fallback.
  - Scale: `xs`: 11px, `sm`: 13px, `base`: 14px, `lg`: 16px, `xl`: 20px, `2xl`: 24px, `3xl`: 30px.
- **Spacing scale**: 4px, 8px, 12px, 16px, 24px, 32px, 48px.
- **Colors**:
  - Background base: `#090d10` (Deep Cryptographic Charcoal)
  - Surface panel: `#0f151b` (Subtle Slate Enclave)
  - Border muted: `#1d2833`
  - Text primary: `#e2e8f0` (High-contrast Off-White)
  - Text muted: `#64748b` (Slate Gray)
  - Accent / Secure: `#00ff9d` (Terminal Krypton Green)
  - Telemetry / Metric: `#38bdf8` (Cyan Blue)
  - Warning / Alert: `#f59e0b` (Amber Gold)
  - Danger / Leak: `#ef4444` (Crimson Red)
- **Radius and borders**: Sharp, industrial aesthetic — `rounded-sm` (2px) and `rounded-md` (4px). Borders are crisp 1px solid `#1d2833`.
- **Button and input height**: Minimum 44px touch targets (`h-11`), dense data tables use 36px for precision.
- **Icon style and stroke**: Lucide Mono / Feather icons, 1.5px crisp stroke width.

## 6. References

| Reference (URL or screenshot) | What to borrow | What not to copy |
|---|---|---|
| HashiCorp Vault UI ([hashicorp.com/vault](https://www.hashicorp.com/products/vault)) | Clean cryptographic security status badges, key unseal indicators | Heavy corporate enterprise marketing fluff, cloud lock-in |
| Linear App ([linear.app](https://linear.app)) | Ultra-fast snappy keyboard ergonomics, dense technical layout, dark palette | SaaS issue tracking workflows, consumer product styling |
| Wireshark / Proxyman | Deep payload inspection view (raw encrypted packet vs decoded stream) | Cluttered desktop win32 layout |

## 7. Mobile

- **390px layout**: Single column vertical flow; navigation collapses to a high-density sticky segmented control bar.
- **Primary action reachable without horizontal scroll**: Action buttons (`Execute Blind Inference`, `Run Benchmark`) pinned at the top/bottom of viewports.
- **What is collapsed or hidden**: Complex multi-dimensional polynomial coordinate table collapses into an expandable drawer on mobile, prioritizing the core graph and verdict.
- **Keyboard behavior**: Input autofocuses without viewport clipping; numeric steppers for $(k, n)$ thresholds.

## 8. Visual direction

- **Three adjectives**: `Cryptographic`, `Precise`, `Industrial`.
- **Product archetype**: `Security Enclave Terminal / Protocol Inspector`.
- **Palette and why it fits the domain**:
  Deep Void Charcoal (`#090d10`) with glowing Krypton Green (`#00ff9d`) and Telemetry Cyan (`#38bdf8`). Represents military-grade hardware security modules, high-assurance cryptographic processors, and zero-trust enclaves.
- **Type pairing**: Monospace-first (`JetBrains Mono` / `Fira Code`) for all telemetry, code blocks, polynomial coordinates, and UI headers.
- **Density**: `Dense`. Every pixel provides cryptographic utility: threshold indicators, CPU cycle measurements, mathematical proofs, and live packet stream.
- **Signature element (one thing this product owns)**:
  **The Dual-Spectrum Enclave HUD**:
  1. Interactive Lagrange Polynomial Interpolation Canvas showing real-time threshold point evaluation $f(x) \pmod p$;
  2. Side-Channel Timing Variance Histogram comparing constant-time Montgomery execution against table-lookup cache leaks.
- **Motion rules**: Zero decorative bounce or spinning blobs. Transitions are immediate ($<150ms$ ease-out) for metric updates and cryptographic status changes.
- **Rejected clichés**: Purple-blue radial gradients, glassmorphism frosted blurs, 3-column marketing feature cards, generic KPI charts, emoji icons, abstract blob vector graphics.

**Generic test**: Could this first screen be dropped into any other SaaS product without looking out of place?
**No**. The dense cryptographic telemetry, polynomial coordinate field, Dudect $t$-statistic histogram, and blind agent execution pipeline are uniquely tailored to Mathematics for Systems Security.

## 9. UX acceptance

- [ ] A first-time user can explain the product's purpose within 5 seconds (Anti-Side-Channel Secret Sharing Enclave for AI Agents).
- [ ] The core task (Key Shredding -> Side-Channel Test -> Blind Agent Query) is reachable without reading documentation.
- [ ] Every action produces visible feedback within 100ms.
- [ ] Every error states what happened and provides a recovery action.
- [ ] Empty states are actionable with pre-filled demo keys/prompts.
- [ ] Desktop (1440px) and mobile (390px) screenshots verified in `evidence/stage-2-build/frontend/`.
- [ ] The flow functions seamlessly with both local simulation and real LLM backends.
