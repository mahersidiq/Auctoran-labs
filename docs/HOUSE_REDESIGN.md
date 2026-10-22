# Auctoran House storefront

The storefront now combines an original daylight campaign with a clearer shopping experience. The black-and-bronze Fortivor artwork is retained. Warm ivory, charcoal, muted olive, and bronze connect the homepage, catalog, product detail, About, customer care, and stack builder.

## Customer experience

- The homepage moves from the Fortivor campaign into product cards with prices, category links, and working bag actions.
- A Fortivor feature explains its declared ingredient amounts and links directly to the full formula.
- The testing section uses the owner's confirmed **“third-party tested”** statement for Fortivor. No laboratory, certification scheme, testing scope, batch frequency, or laboratory result has been supplied or invented.
- The About page explains the brand's point of view without invented founder history, customer reviews, or endorsements.
- Product pages retain the original front artwork and supplied Supplement Facts document. Additional campaign photography appears separately from those factual label documents.
- Cross-page links now reach the formula, product information, and testing sections, including keyboard focus.
- The bag, filters, gallery zoom/swipe, stack matching, payment validation, and demo checkout remain functional. New service navigation is included in modal background isolation.

## Original assets and fonts

The four campaign scenes are AI-generated advertising artwork using the existing Fortivor packaging as a reference. The people are illustrative campaign models, not documented customers or endorsers. Flavor imagery illustrates Blue Raspberry Watermelon; the complete ingredient list remains the source for ingredient information.

| Asset | Use |
| --- | --- |
| `public/assets/campaign-bench.webp` | Homepage campaign and brand feature |
| `public/assets/campaign-ritual.webp` | Preparation story, catalog, care, and stack builder |
| `public/assets/campaign-flavor.webp` | Fortivor flavor and formula features |
| `public/assets/campaign-training.webp` | Training story, About page, and stack invitation |

Each scene has a 1536px desktop image and a 768px mobile derivative. Desktop images are approximately 156–179 KiB; mobile images are approximately 55–65 KiB. Only the first campaign image loads eagerly; other campaign scenes load lazily with explicit dimensions.

Manrope and Barlow Condensed are self-hosted as WOFF2. The source fonts are from the official [Google Fonts repository](https://github.com/google/fonts), at `ofl/manrope` and `ofl/barlowcondensed`. Both OFL license notices are included in `public/assets/fonts/`. The website does not require a third-party font service or any new production package.

## Run and validate

```bash
npm run dev
npm run check
node scripts/browser-qa.mjs
```

`npm run check` includes syntax checks and the 19 existing backend, product-facts, and matching tests. Browser QA uses the external Chromium/Playwright installation, configurable with `CHROMIUM_PATH`, `PLAYWRIGHT_MODULE`, and `QA_BASE_URL`.

Browser results are saved to `docs/house-browser-results.json`. Current screenshots use the `screenshots/house-` prefix, retaining the previous design's screenshots for comparison. The suite covers 15 checks, including 16 responsive renders at 1440, 1024, 390, and 430px, all six product pages at 320 and 768px, gallery controls, keyboard behavior, product quick-add, section navigation, cart restoration, filtering, demo checkout, and checkout error recovery.

An optional automated accessibility audit can be run without adding a production dependency:

```bash
npm install --prefix /tmp/auctoran-audit --cache /tmp/auctoran-npm-cache --no-package-lock --no-audit --no-fund axe-core
AXE_SOURCE=/tmp/auctoran-audit/node_modules/axe-core/axe.min.js node scripts/accessibility-qa.mjs
```

The audit checks the six principal pages at desktop and mobile widths, search/bag/menu dialogs, and stack preferences and empty states. Results, including checks needing human review, are in `docs/house-accessibility-results.json`. Automated results are not a complete accessibility certification.

## Mobile alignment polish

The collection's mobile category links inherited older alternating padding and 50% width rules. That created a half-width column with inconsistent arrow insets. The category navigation now uses equal-width grid cells: two columns on phones, three on tablets, and six on larger screens. Every link has the same padding, a fixed-size icon, and a minimum 44px touch target. The collection's mobile heading and shop link occupy separate rows.

The same review also aligned product prices and buttons across each card row, increased small card text, standardized control icons, enlarged header and quantity controls, and reflowed filled shopping bags on narrow screens. The mobile purchase bar stays hidden until the primary purchase controls have scrolled above the viewport. Gallery navigation uses matching SVG arrows.

```bash
node scripts/layout-qa.mjs
```

The layout suite checks 14 routes at 14 widths from 320 to 1440px, including the responsive breakpoints: **196 page layouts**, plus filled-bag, primary-purchase, and sticky-purchase states. Assertions cover arrow insets and centering, icon dimensions, category grid geometry, card baselines, header overlap, touch targets, horizontal overflow, and loaded images. It also verifies quantity changes and sticky-bar timing. Results are in `docs/layout-results.json`; reviewed screenshots use the `screenshots/polish-` prefix.

After this polish, all 19 automated tests, 15 browser check groups, 196 layout combinations, three additional layout states, and 17 accessibility scans passed. Browser validation used Chromium with mobile/touch input emulation. Safari and a physical iPhone were not tested; the official WebKit browser download was blocked by the environment's network policy.

## Launch configuration still required

This change prepares the design and preserves the existing checkout configuration. It does not deploy the website or enable live payment processing. The current environment remains in demo mode.

The owner's testing confirmation is recorded as `thirdPartyTested: true` for Fortivor. Existing price, inventory, label, serving-size, and directions approval flags have not been inferred from that testing statement. In particular, the supplied formula totals 18,650 mg while the supplied label says 18 g; the serving line and directions still need correction and confirmation. The collection previews retain their current availability disclosures until their product details are supplied.

Before enabling sales, supply the final product information, support email, shipping settings, and Stripe configuration described in the README and `.env.example`.
