const { chromium } = require('../web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'evidence', 'stage-2-build', 'frontend');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop 1440x900
  const contextDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await contextDesktop.newPage();

  console.log('Navigating to http://127.0.0.1:3000 (Desktop)...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Tab 1: Initial Enclave
  await page.screenshot({ path: path.join(OUT_DIR, '01-desktop-enclave-initial.png') });

  // Click Ingest & Shred
  console.log('Clicking Ingest & Shred Master Key...');
  await page.click('button:has-text("Ingest & Shred Master Key")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, '02-desktop-enclave-shredded.png') });

  // Reconstruct
  console.log('Clicking Reconstruct via Lagrange Interpolation...');
  const reconstructBtn = page.locator('button:has-text("Reconstruct via Lagrange Interpolation")');
  if (await reconstructBtn.isVisible()) {
    await reconstructBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, '03-desktop-enclave-reconstructed.png') });
  }

  // Tab 2: Side-Channel Audit
  console.log('Navigating to Side-Channel Audit...');
  await page.click('button:has-text("2. Side-Channel Audit")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Run Side-Channel Audit")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '04-desktop-sidechannel-audit.png') });

  // Tab 3: AI Agent Gateway
  console.log('Navigating to AI Agent Gateway...');
  await page.click('button:has-text("3. AI Agent Gateway")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Execute Blind Inference")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, '05-desktop-agent-gateway-success.png') });

  // Simulate Attack
  console.log('Simulating Prompt Injection Attack...');
  await page.click('input[type="checkbox"]');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Execute Blind Inference")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, '06-desktop-agent-gateway-attack-blocked.png') });

  // Tab 4: LaTeX Specs
  console.log('Navigating to LaTeX Specs...');
  await page.click('button:has-text("4. LaTeX Specs & Proofs")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, '07-desktop-latex-specs.png') });

  await contextDesktop.close();

  // 2. Mobile 390x844 (iPhone 12/13/14 viewport)
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await contextMobile.newPage();
  console.log('Navigating to http://127.0.0.1:3000 (Mobile 390px)...');
  await mobilePage.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  await mobilePage.click('button:has-text("Ingest & Shred Master Key")');
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(OUT_DIR, '08-mobile-390px-enclave.png') });

  await mobilePage.click('button:has-text("2. Side-Channel Audit")');
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(OUT_DIR, '09-mobile-390px-audit.png') });

  await mobilePage.click('button:has-text("3. AI Agent Gateway")');
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(OUT_DIR, '10-mobile-390px-pipeline.png') });

  await contextMobile.close();
  await browser.close();
  console.log('All screenshots captured successfully into', OUT_DIR);
}

run().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
