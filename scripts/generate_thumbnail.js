const { chromium } = require('../web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function generateThumbnail() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2,
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 800px;
      background: #060a0d;
      color: #e2e8f0;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 64px 80px;
      position: relative;
      overflow: hidden;
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(ellipse 900px 600px at 50% 40%, rgba(0, 255, 157, 0.08), transparent 70%),
        linear-gradient(to right, rgba(29, 40, 51, 0.4) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(29, 40, 51, 0.4) 1px, transparent 1px);
      background-size: 100% 100%, 40px 40px, 40px 40px;
      pointer-events: none;
    }
    .hud-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #1d2833;
      background: rgba(15, 21, 27, 0.85);
      padding: 14px 24px;
      border-radius: 4px;
      font-size: 13px;
      color: #00ff9d;
      letter-spacing: 0.05em;
    }
    .center-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-top: auto;
      margin-bottom: auto;
      z-index: 10;
    }
    .kicker {
      color: #38bdf8;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    h1 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 68px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.05;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
    }
    h1 span {
      color: #00ff9d;
      text-shadow: 0 0 30px rgba(0, 255, 157, 0.4);
    }
    .tagline {
      font-size: 20px;
      color: #94a3b8;
      line-height: 1.5;
      max-width: 860px;
      margin-bottom: 36px;
    }
    .badges {
      display: flex;
      gap: 14px;
    }
    .badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #0f151b;
      border: 1px solid #1d2833;
      padding: 10px 18px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
    }
    .badge.green { border-color: rgba(0, 255, 157, 0.5); color: #00ff9d; }
    .badge.cyan { border-color: rgba(56, 189, 248, 0.5); color: #38bdf8; }
    .badge.amber { border-color: rgba(245, 158, 11, 0.5); color: #f59e0b; }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #1d2833;
      padding-top: 20px;
      font-size: 12px;
      color: #64748b;
      z-index: 10;
    }
  </style>
</head>
<body>
  <div class="grid-bg"></div>

  <div class="hud-header">
    <div>[SYS::AEGIS-ENCLAVE] // MATHEMATICS FOR SYSTEMS SECURITY</div>
    <div>CONSTANT-TIME F_{2^31 - 1} · ZERO-KNOWLEDGE GATEWAY</div>
  </div>

  <div class="center-content">
    <div class="kicker">Confidential AI Agent Cryptographic Enclave</div>
    <h1>Aegis<span>Agent</span></h1>
    <p class="tagline">
      Eliminating side-channel cache leaks via constant-time Cauchy-Mersenne secret sharing, and isolating Master API Keys from AI prompt injection attacks.
    </p>

    <div class="badges">
      <div class="badge green">
        <span>✔</span> Constant-Time Mersenne F_{2^31-1}
      </div>
      <div class="badge cyan">
        <span>✔</span> Dudect Timing Audit |t| = 0.398 &lt; 4.5
      </div>
      <div class="badge amber">
        <span>✔</span> 0 Bytes Master Key Leakage
      </div>
    </div>
  </div>

  <div class="footer">
    <div>RUST LOW-LEVEL ENGINE · CAUCHY MDS DUAL BASIS · HOMOMORPHIC BLINDING</div>
    <div>DEVPOST 2026 SUBMISSION</div>
  </div>
</body>
</html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(500);

  const outPath = path.resolve('submission/assets/thumbnail.png');
  await page.screenshot({ path: outPath, type: 'png' });
  await browser.close();
  console.log('Thumbnail successfully generated at:', outPath);
}

generateThumbnail().catch(err => {
  console.error(err);
  process.exit(1);
});
