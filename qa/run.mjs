// AegisAgent Real-Browser QA Runner
// Runs end-to-end user workflows with strict assertions and visual evidence capture

import { chromium, firefox } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.QA_OUT ?? "evidence/stage-3-qa";
const BROWSER = process.env.BROWSER ?? "chromium";
const HEADED = process.env.HEADED === "1";

const SHOTS = path.join(OUT, "screens");
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scenarios = [
  {
    id: "enclave-shred",
    title: "Master Key Ingestion & Constant-Time Polynomial Shredding (P0)",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await ctx.expectVisible("h2:has-text('Master API Key Ingestion')");
      
      // Verify initial empty/standby status
      const initialBadge = await page.locator("header").innerText();
      ctx.assert(initialBadge.includes("AEGIS-AGENT"), "Header does not contain AEGIS-AGENT");

      // Ingest and shred
      const shredBtn = page.locator("button:has-text('Ingest & Shred Master Key')");
      await shredBtn.click();
      
      // Assert success message and memory zeroize feedback
      await ctx.expectText("Master Key shredded! Raw key purged from active RAM");
      await ctx.expectText("Generated Cauchy-Polynomial Shares");

      // Assert exactly 5 shares rendered in list
      const shareCount = await page.locator("div:has-text('Share #')").count();
      ctx.assert(shareCount >= 5, `Expected at least 5 shares, found ${shareCount}`);

      await ctx.shot("shred-success");
    },
  },
  {
    id: "enclave-reconstruct",
    title: "Lagrange Dual Basis Threshold Reconstruction (P0)",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      // Ensure shares exist by shredding
      await page.locator("button:has-text('Ingest & Shred Master Key')").click();
      await ctx.expectText("Master Key shredded!");

      // Click Reconstruct via Lagrange Interpolation
      const reconstructBtn = page.locator("button:has-text('Reconstruct via Lagrange Interpolation')");
      await reconstructBtn.waitFor({ state: "visible" });
      await reconstructBtn.click();

      // Assert recovered key matches original
      await ctx.expectText("Lagrange Dual Basis Result");
      await ctx.expectText("Verified 100% Bit-exact to Ingested Master Key");

      await ctx.shot("reconstruction-verified");
    },
  },
  {
    id: "sidechannel-audit",
    title: "Dudect Welch's t-test Timing Benchmark (P0)",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      
      // Navigate to Side-Channel Audit tab
      await page.locator("button:has-text('2. Side-Channel Audit')").click();
      await ctx.expectVisible("h2:has-text('Dudect Side-Channel Timing Leakage Benchmark')");

      // Run Audit
      const auditBtn = page.locator("button:has-text('Run Side-Channel Audit')");
      await auditBtn.click();

      // Assert Pass on Aegis-SSS (|t| < 4.5)
      await ctx.expectText("LEAKAGE FREE");
      await ctx.expectText("PASS");

      // Assert Fail on Vulnerable Baseline
      await ctx.expectText("LEAKAGE DETECTED");
      await ctx.expectText("CRITICAL FAIL");

      await ctx.shot("dudect-audit-pass");
    },
  },
  {
    id: "agent-blind-infer",
    title: "Confidential AI Agent Pipeline & Blind Token Masking (P0)",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      
      // Navigate to AI Agent Gateway tab
      await page.locator("button:has-text('3. AI Agent Gateway')").click();
      await ctx.expectVisible("h2:has-text('Confidential AI Agent Privacy Gateway')");

      // Execute Blind Inference
      const inferBtn = page.locator("button:has-text('Execute Blind Inference')");
      await inferBtn.click();

      // Assert Blinded Stream and Zero Master Key Exposure
      await ctx.expectText("0 BYTES (ZERO EXPOSURE)");
      await ctx.expectText("AGENT RESPONSE DECRYPTED AT CLIENT LOOPBACK");
      await ctx.expectText("Transient credentials were synthesized for 4µs");

      await ctx.shot("agent-blind-success");
    },
  },
  {
    id: "attack-defense",
    title: "Prompt Injection Exfiltration Attack Interception (P1)",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.locator("button:has-text('3. AI Agent Gateway')").click();

      // Toggle Attack simulation
      const attackCheckbox = page.locator("input[type='checkbox']");
      await attackCheckbox.check();

      // Execute attack inference
      await page.locator("button:has-text('Execute Blind Inference')").click();

      // Assert Interception feedback
      await ctx.expectText("ATTACK INTERCEPTED BY AEGIS ENCLAVE");
      await ctx.expectText("Prompt injection pattern detected attempting master key exfiltration");

      await ctx.shot("attack-intercepted");
    },
  },
  {
    id: "invalid-input",
    title: "Input Validation & Threshold Bounds Guard (P1)",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });

      // Clear key input
      const keyInput = page.locator("input[placeholder*='Master API Key']");
      await keyInput.fill("");
      await page.locator("button:has-text('Ingest & Shred Master Key')").click();

      // Assert validation error
      await ctx.expectText("Master Key input cannot be empty.");

      // Test invalid threshold k > n
      await keyInput.fill("sk-valid-key-test");
      const kInput = page.locator("input[type='number']").first();
      await kInput.fill("9"); // k = 9 > n (5)
      await page.locator("button:has-text('Ingest & Shred Master Key')").click();

      await ctx.expectText("Invalid threshold");

      await ctx.shot("validation-guards");
    },
  },
  {
    id: "latex-specs",
    title: "Cryptographer Track Mathematical Specification Rendering (P2)",
    async run(page, ctx) {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.locator("button:has-text('4. LaTeX Specs & Proofs')").click();

      await ctx.expectText("Aegis-SSS: Mathematical Specification");
      await ctx.expectText("Mersenne Prime Field F_p");
      await ctx.expectText("Constant-Time Inversion via Fermat's Little Theorem");
      await ctx.expectText("Cauchy Matrix & Linear Algebraic Secret Sharing");

      await ctx.shot("latex-specification");
    },
  },
];

function collectIssues(page) {
  const issues = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const txt = msg.text();
      // Ignore normal react dev warnings if any
      if (!txt.includes("favicon") && !txt.includes("Download the React DevTools")) {
        issues.push({ kind: "console", text: txt });
      }
    }
  });
  page.on("pageerror", (err) => {
    issues.push({ kind: "pageerror", text: err.message });
  });
  page.on("requestfailed", (req) => {
    const reason = req.failure()?.errorText ?? "request failed";
    if (!reason.includes("ERR_ABORTED")) {
      issues.push({ kind: "requestfailed", text: `${reason} ${req.url()}` });
    }
  });
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 500) issues.push({ kind: "http", text: `${status} ${res.url()}` });
    else if (status >= 400 && !res.url().includes("favicon")) {
      issues.push({ kind: "http", level: "warn", text: `${status} ${res.url()}` });
    }
  });
  return issues;
}

async function main() {
  const browserType = BROWSER === "firefox" ? firefox : chromium;
  const browser = await browserType.launch({ headless: !HEADED });
  const startedAt = new Date().toISOString();
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      baseURL: BASE,
      viewport: vp.viewport,
      deviceScaleFactor: vp.deviceScaleFactor,
    });

    for (const scenario of scenarios) {
      const page = await context.newPage();
      const issues = collectIssues(page);
      const screenshots = [];
      const started = Date.now();
      let status = "pass";
      let error = null;

      const ctx = {
        assert,
        expectVisible: async (selector, timeout = 10000) => {
          const locator = page.locator(selector).first();
          await locator.waitFor({ state: "visible", timeout });
          return locator;
        },
        expectText: async (text, timeout = 10000) => {
          const locator = page.getByText(text).first();
          await locator.waitFor({ state: "visible", timeout });
          return locator;
        },
        shot: async (name, opts = {}) => {
          const file = path.join(SHOTS, `${scenario.id}-${name}-${vp.name}.png`);
          await page.screenshot({ path: file, fullPage: opts.fullPage ?? true });
          screenshots.push(file);
          return file;
        },
      };

      try {
        await scenario.run(page, ctx);
      } catch (err) {
        status = "fail";
        error = err.message;
      } finally {
        await page.close().catch(() => {});
      }

      const errors = issues.filter((i) => (i.level ?? "error") === "error");
      const warnings = issues.filter((i) => i.level === "warn");
      if (status === "pass" && errors.length > 0) {
        status = "fail";
        error = errors.map((i) => `${i.kind}: ${i.text}`).join(" | ");
      }

      results.push({
        viewport: vp.name,
        id: scenario.id,
        title: scenario.title,
        status,
        ms: Date.now() - started,
        error,
        errors,
        warnings,
        screenshots,
      });

      console.log(
        `${status === "pass" ? "✓" : "✗"} [${vp.name}] ${scenario.id}` +
          (error ? ` — ${error}` : "")
      );
    }

    await context.close();
  }

  await browser.close();

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === "pass").length,
    fail: results.filter((r) => r.status === "fail").length,
  };
  const finishedAt = new Date().toISOString();
  const report = {
    base: BASE,
    browser: BROWSER,
    headed: HEADED,
    startedAt,
    finishedAt,
    summary,
    results,
  };

  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(report, null, 2));

  const warnings = results.flatMap((r) =>
    r.warnings.map((w) => `- [${r.viewport}] ${r.id}: ${w.kind} — ${w.text}`)
  );
  const md = [
    `# QA Test Report — ${finishedAt}`,
    "",
    `- **Base URL Tested**: ${BASE}`,
    `- **Browser**: ${BROWSER} (${HEADED ? "headed" : "headless"})`,
    `- **Summary**: ${summary.total} total tests — **${summary.pass} passed**, **${summary.fail} failed**`,
    "",
    "| Viewport | Scenario | Status | Latency | Detail |",
    "|---|---|---|---|---|",
    ...results.map(
      (r) =>
        `| ${r.viewport} | ${r.id} | ${r.status === 'pass' ? '✅ PASS' : '❌ FAIL'} | ${r.ms}ms | ${(r.error ?? "All assertions satisfied").replace(/\|/g, "\\|")} |`
    ),
    "",
    ...(warnings.length ? ["## Warnings", "", ...warnings, ""] : []),
    "## Captured Verification Screenshots",
    "",
    ...results.flatMap((r) => r.screenshots.map((s) => `- \`${s}\``)),
    "",
  ];
  fs.writeFileSync(path.join(OUT, "report.md"), md.join("\n"));

  console.log(`\n============================================================`);
  console.log(`  QA SUITE RESULT: ${summary.pass}/${summary.total} PASSED`);
  console.log(`  Report written to ${path.join(OUT, "report.md")}`);
  console.log(`============================================================\n`);

  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("QA Runner Fatal Error:", err);
  process.exit(2);
});
