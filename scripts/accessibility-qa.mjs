// Optional audit. Set AXE_SOURCE to an installed axe-core/axe.min.js file.
// Keeps browser/audit tooling outside this dependency-free application.
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs'));
const axeSource = process.env.AXE_SOURCE;
if (!axeSource) throw new Error('Set AXE_SOURCE to the absolute path of axe-core/axe.min.js. See docs/HOUSE_REDESIGN.md.');
await fs.access(axeSource);
const base = process.env.QA_BASE_URL || 'http://localhost:3000';
const output = path.resolve(process.env.QA_OUTPUT_DIR || 'storage/qa');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ reducedMotion: 'reduce' });
const results = [];
async function audit(name) {
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ path: axeSource });
  const result = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return {
      violations: r.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) })),
      passedRules: r.passes.length,
      incomplete: r.incomplete.map(r => r.id)
    };
  });
  results.push({ name, ...result });
  console.log(`${result.violations.length ? 'FAIL' : 'PASS'} ${name}: ${result.violations.length} violations, ${result.passedRules} passed rules`);
}
try {
  const routes = [['homepage', '/'], ['Fortivor', '/product/fortivor-pre-workout'], ['about', '/about'], ['bag', '/cart'], ['shipping', '/info/shipping'], ['contact', '/contact']];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    for (const [name, route] of routes) {
      await page.goto(base + route);
      await page.locator('main').waitFor();
      await audit(`${name} at ${width}px`);
    }
  }
  await page.goto(base + '/#compare');
  await page.locator('.comparison-sources summary').click();
  await audit('expanded comparison at 390px');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await audit('expanded comparison at 1440px');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/');
  await page.locator('main').waitFor();
  for (const [name, trigger] of [['shopping bag dialog', '[data-action="openCart"]'], ['mobile menu dialog', '[data-action="openMenu"]']]) {
    await page.locator(trigger).click();
    await audit(name);
    await page.keyboard.press('Escape');
  }
  await page.goto(base + '/product/fortivor-pre-workout');
  await page.locator('#supplement-information summary').filter({ hasText: 'LABEL STATUS' }).click();
  await audit('product label disclosure');
  await page.locator('#formula').scrollIntoViewIfNeeded();
  await page.locator('.interactive-formula details').nth(1).locator('summary').click();
  await audit('expanded formula highlights');
  assert.equal(results.reduce((n, r) => n + r.violations.length, 0), 0, 'Accessibility violations remain; see storage/qa/accessibility-results.json.');
} finally {
  await fs.writeFile(path.join(output, 'accessibility-results.json'), JSON.stringify({ testedAt: new Date().toISOString(), engine: 'Chromium', base, scope: 'Automated WCAG 2 A/AA and 2.1 AA checks; incomplete results require human review. This is not an accessibility certification.', results }, null, 2));
  await browser.close();
}
