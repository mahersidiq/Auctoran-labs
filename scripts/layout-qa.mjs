// Observable layout checks: alignment, wrapping, touch targets, and icon geometry.
// Optional WebKit run: QA_BROWSER=webkit PLAYWRIGHT_BROWSERS_PATH=... node scripts/layout-qa.mjs
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const playwright = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs'));
const engine = process.env.QA_BROWSER || 'chromium';
if (!['chromium', 'webkit'].includes(engine)) throw new Error('QA_BROWSER must be chromium or webkit.');
const browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : { headless: true });
const base = process.env.QA_BASE_URL || 'http://localhost:3000';
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
const results = [], interactions = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const go = async path => {
  await page.goto(base + path);
  await page.locator('main').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
};
const readyImages = async () => page.evaluate(async () => {
  await Promise.all([...document.images].map(async image => { image.loading = 'eager'; try { await image.decode(); } catch {} }));
});
async function inspect() {
  return page.evaluate(() => {
    const issues = [];
    const visible = element => {
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !element.closest('[inert]');
    };
    if (document.documentElement.scrollWidth > innerWidth + 1) issues.push(`Page overflow: ${document.documentElement.scrollWidth}px / ${innerWidth}px`);
    for (const icon of document.querySelectorAll('a > .ui-icon, button > .ui-icon, summary > .ui-icon')) {
      const control = icon.parentElement;
      if (!visible(control) || !visible(icon)) continue;
      const box = control.getBoundingClientRect(), svg = icon.getBoundingClientRect(), style = getComputedStyle(control), iconStyle = getComputedStyle(icon);
      if (box.right < 0 || box.left > innerWidth) continue;
      const top = parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth), bottom = parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth);
      const center = box.top + top + (box.height - top - bottom) / 2;
      const label = control.getAttribute('aria-label') || control.textContent.trim().slice(0, 50);
      if (Math.abs(svg.top + svg.height / 2 - center) > 2) issues.push(`Icon vertical alignment: ${label}`);
      // Open accordions rotate their plus icon; compare the unrotated canvas.
      const width = parseFloat(iconStyle.width), height = parseFloat(iconStyle.height), centerX = svg.left + svg.width / 2;
      if (centerX - width / 2 < box.left - 1 || centerX + width / 2 > box.right + 1) issues.push(`Icon escapes control: ${label}`);
      const expected = parseFloat(icon.style.getPropertyValue('--icon-size'));
      if (Math.abs(width - expected) > 1 || Math.abs(height - expected) > 1) issues.push(`Icon stretched or shrunk: ${label}`);
    }
    for (const control of document.querySelectorAll('.header-actions .icon-button, .product-quick-add, .quantity-control button, .gallery-tools button')) {
      if (!visible(control)) continue;
      const box = control.getBoundingClientRect();
      if (box.width < 43.5 || box.height < 43.5) issues.push(`Small touch target (${Math.round(box.width)}×${Math.round(box.height)}): ${control.getAttribute('aria-label') || control.textContent.trim()}`);
    }
    const header = document.querySelector('.site-header');
    if (header) {
      const parts = [...header.children].filter(visible).map(element => ({ name: element.className, box: element.getBoundingClientRect() }));
      for (let i = 1; i < parts.length; i++) if (parts[i - 1].box.right > parts[i].box.left - 4) issues.push(`Header overlap: ${parts[i - 1].name} / ${parts[i].name}`);
    }
    const categories = [...document.querySelectorAll('.house-category-nav > a')];
    if (categories.length) {
      const links = categories.map(link => ({ box: link.getBoundingClientRect(), icon: link.querySelector('svg').getBoundingClientRect() }));
      const columns = innerWidth <= 760 ? 2 : innerWidth <= 900 ? 3 : 6;
      const gutters = links.map(({ box, icon }) => box.right - icon.right);
      if (Math.max(...gutters) - Math.min(...gutters) > 1) issues.push('Category arrow right insets differ');
      for (let i = 0; i < links.length; i += columns) {
        const row = links.slice(i, i + columns);
        if (Math.max(...row.map(r => r.box.top)) - Math.min(...row.map(r => r.box.top)) > 1) issues.push('Category links do not share a row');
        if (Math.max(...row.map(r => r.box.width)) - Math.min(...row.map(r => r.box.width)) > 1) issues.push('Category widths differ');
        if (row.some(r => r.box.height < 43.5)) issues.push('Category touch targets are too short');
      }
    }
    for (const grid of document.querySelectorAll('.home-product-grid, .shop-grid')) {
      const rows = [];
      for (const card of grid.querySelectorAll('.product-card')) {
        const top = card.getBoundingClientRect().top;
        let row = rows.find(row => Math.abs(row.top - top) < 1);
        if (!row) rows.push(row = { top, cards: [] });
        row.cards.push(card);
      }
      for (const row of rows) {
        for (const [selector, edge] of [['.product-image', 'bottom'], ['.product-pricing strong', 'bottom'], ['.product-quick-add', 'bottom']]) {
          const positions = row.cards.map(card => card.querySelector(selector)?.getBoundingClientRect()[edge]).filter(Number.isFinite);
          if (Math.max(...positions) - Math.min(...positions) > 1.5) issues.push(`Product row alignment: ${selector}`);
        }
      }
    }
    for (const image of document.images) if (image.complete && !image.naturalWidth) issues.push(`Broken image: ${image.getAttribute('src')}`);
    return { issues, h1Count: document.querySelectorAll('h1').length };
  });
}
try {
  await go('/');
  await page.locator('.home-product-grid .product-quick-add').first().click();
  await page.keyboard.press('Escape');
  const products = (await (await page.request.get(base + '/api/products')).json()).products;
  const routes = ['/', '/shop', ...products.map(p => '/product/' + p.slug), '/about', '/contact', '/info/shipping', '/info/returns', '/build-your-stack', '/cart'];
  for (const width of [320, 360, 375, 390, 393, 414, 430, 600, 760, 768, 900, 901, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 760 ? 852 : 1000 });
    const start = results.length;
    for (const path of routes) {
      await go(path);
      const result = await inspect();
      if (result.h1Count !== 1) result.issues.push(`Expected one page heading, found ${result.h1Count}`);
      results.push({ width, path, ...result });
    }
    console.log(`${results.slice(start).some(r => r.issues.length) ? 'FAIL' : 'PASS'} ${width}px: ${routes.length} page layouts`);
  }
  await page.setViewportSize({ width: 393, height: 852 });
  await go('/');await readyImages();
  await page.locator('.house-collection').evaluate(section => {
    document.activeElement?.blur();
    scrollTo(0, section.getBoundingClientRect().top + scrollY - 90);
  });
  await page.screenshot({ path: 'screenshots/polish-collection-mobile.jpg', type: 'jpeg', quality: 85 });
  await page.locator('.home-product-grid .product-quick-add').first().click();
  interactions.push({ name: 'Filled shopping bag layout', ...(await inspect()) });
  await page.locator('.cart-drawer').screenshot({ path: 'screenshots/polish-bag-mobile.jpg', type: 'jpeg', quality: 85 });
  await page.locator('.cart-drawer [data-action="increase"]').first().click();
  await page.keyboard.press('Escape');
  await go('/cart');await readyImages();
  await page.screenshot({ path: 'screenshots/polish-cart-mobile.jpg', type: 'jpeg', quality: 85, fullPage: true });
  assert.equal(await page.locator('.cart-list output').first().innerText(), '3');
  await go('/product/fortivor-pre-workout');
  assert.equal(await page.locator('.mobile-purchase').isVisible(), false, 'Sticky purchase should not cover the initial product gallery.');
  await page.locator('#primary-purchase').scrollIntoViewIfNeeded();
  interactions.push({ name: 'Product purchase controls', ...(await inspect()) });
  await page.locator('#primary-purchase').screenshot({ path: 'screenshots/polish-purchase-mobile.jpg', type: 'jpeg', quality: 85 });
  await page.locator('#product-faq').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('.mobile-purchase').hidden);
  interactions.push({ name: 'Sticky purchase after primary controls', ...(await inspect()) });
  await page.setViewportSize({ width: 1440, height: 1000 });await go('/');await readyImages();
  await page.locator('.house-collection').evaluate(section => {
    document.activeElement?.blur();
    scrollTo(0, section.getBoundingClientRect().top + scrollY - 110);
  });
  await page.screenshot({ path: 'screenshots/polish-collection-desktop.jpg', type: 'jpeg', quality: 85 });
  const issues = [...results, ...interactions].flatMap(r => r.issues.map(issue => ({ width: r.width, path: r.path || r.name, issue })));
  if (issues.length) console.error(JSON.stringify(issues.slice(0, 30), null, 2));
  assert.equal(issues.length, 0, `${issues.length} layout issues remain.`);
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile('docs/layout-results.json', JSON.stringify({ testedAt: new Date().toISOString(), engine, mobileInput: true, physicalDeviceTested: false, results, interactions, errors }, null, 2));
  await browser.close();
}
