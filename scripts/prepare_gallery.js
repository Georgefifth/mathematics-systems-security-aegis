const { chromium } = require('../web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve('submission/assets');

async function prepareGallery() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 1. Enclave Vault Shredded
  console.log('Generating gallery-01-enclave-vault.png...');
  await page.click('button:has-text("Ingest & Shred Master Key")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, 'gallery-01-enclave-vault.png') });

  // 2. Side-Channel Audit
  console.log('Generating gallery-02-sidechannel-dudect.png...');
  await page.click('button:has-text("2. Side-Channel Audit")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Run Side-Channel Audit")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, 'gallery-02-sidechannel-dudect.png') });

  // 3. AI Agent Gateway Success
  console.log('Generating gallery-03-agent-gateway.png...');
  await page.click('button:has-text("3. AI Agent Gateway")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Execute Blind Inference")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, 'gallery-03-agent-gateway.png') });

  // 4. Prompt Injection Interception
  console.log('Generating gallery-04-prompt-injection-defense.png...');
  await page.click('input[type="checkbox"]');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Execute Blind Inference")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, 'gallery-04-prompt-injection-defense.png') });

  // 5. LaTeX Specifications
  console.log('Generating gallery-05-latex-specifications.png...');
  await page.click('button:has-text("4. LaTeX Specs & Proofs")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, 'gallery-05-latex-specifications.png') });

  await context.close();

  // 6. Architecture & Benchmark Slides (from slides.html)
  const slideContext = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2,
  });
  const slidePage = await slideContext.newPage();
  const slidesPath = 'file://' + path.resolve('demo/slides.html');
  await slidePage.goto(slidesPath, { waitUntil: 'networkidle' });
  await slidePage.waitForTimeout(500);
  await slidePage.screenshot({ path: path.join(OUT_DIR, 'gallery-06-architecture-topology.png') });

  await slideContext.close();
  await browser.close();
  console.log('All gallery assets generated successfully in', OUT_DIR);
}

prepareGallery().catch(err => {
  console.error(err);
  process.exit(1);
});
