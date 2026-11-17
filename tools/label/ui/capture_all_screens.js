const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const brainScreenshotsDir = 'C:\\Users\\ahmad\\.gemini\\antigravity\\brain\\1e09d07c-74cd-4efa-8dbd-e97c7d1b27bc\\screenshots';
  const brainRootDir = 'C:\\Users\\ahmad\\.gemini\\antigravity\\brain\\1e09d07c-74cd-4efa-8dbd-e97c7d1b27bc';
  const localScreenshotsDir = path.resolve(__dirname, '..', '..', 'screenshots');
  
  for (const dir of [brainScreenshotsDir, brainRootDir, localScreenshotsDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Launching browser with Microsoft Edge channel...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.25,
  });

  const page = await context.newPage();

  // Helper to save to all target directories
  async function saveScreenshot(filename) {
    const p1 = path.join(brainScreenshotsDir, filename);
    const p2 = path.join(localScreenshotsDir, filename);
    const p3 = path.join(brainRootDir, filename);
    
    await page.screenshot({ path: p1 });
    fs.copyFileSync(p1, p2);
    fs.copyFileSync(p1, p3);
    console.log(`Saved screenshot: ${filename}`);
  }

  // Screen 1: Overview & Analytics Dashboard
  console.log('Capturing Screen 1: Overview & Analytics Dashboard...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await saveScreenshot('01_compl_ai_studio_overview.png');

  // Screen 2: LLM Rules Safety & Policy Benchmark
  console.log('Capturing Screen 2: LLM Rules Safety & Policy Benchmark...');
  await page.goto('http://localhost:3000/?tab=llm_rules', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await saveScreenshot('02_dataset_llm_rules.png');

  // Screen 3: AIME 2025 Math Benchmark
  console.log('Capturing Screen 3: AIME 2025 Math Benchmark...');
  await page.goto('http://localhost:3000/?tab=aime_2025', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await saveScreenshot('03_dataset_aime_2025.png');

  // Screen 4: CAB Context-Aware Bias Benchmark
  console.log('Capturing Screen 4: CAB Bias Benchmark...');
  await page.goto('http://localhost:3000/?tab=cab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await saveScreenshot('04_dataset_cab_bias.png');

  // Screen 5: Inspection Drawer Detail View (AIME 2025 Sample #2)
  console.log('Capturing Screen 5: Inspection Drawer Detail View...');
  await page.goto('http://localhost:3000/?tab=aime_2025', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  
  // Click row with data-index="1" or "2" to open sample inspection drawer
  const cell = page.locator('tr[data-index="1"] td').first();
  await cell.waitFor({ state: 'visible', timeout: 10000 });
  await cell.click({ force: true });
  await page.waitForTimeout(2000);
  await saveScreenshot('05_sample_inspection_drawer.png');

  await browser.close();
  console.log('All 5 high-resolution screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
