const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const brainScreenshotsDir = 'C:\\Users\\ahmad\\.gemini\\antigravity\\brain\\1e09d07c-74cd-4efa-8dbd-e97c7d1b27bc\\screenshots';
  const localScreenshotsDir = path.resolve(__dirname, '..', 'screenshots');

  console.log('Launching browser for drawer capture...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.25,
  });

  const page = await context.newPage();

  console.log('Navigating to aime_2025 benchmark...');
  await page.goto('http://localhost:3000/?tab=aime_2025', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Clicking on row 0...');
  const cell = page.locator('tr[data-index="0"] td').first();
  await cell.waitFor({ state: 'visible', timeout: 10000 });
  await cell.click({ force: true });
  await page.waitForTimeout(2000);

  const filename = '05_sample_inspection_drawer.png';
  const p1 = path.join(brainScreenshotsDir, filename);
  const p2 = path.join(localScreenshotsDir, filename);

  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
  console.log(`Saved ${filename} in both directories!`);

  await browser.close();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
