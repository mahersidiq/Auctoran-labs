# Fortivor-focused storefront

The store launches around one product: Fortivor Blue Raspberry Watermelon pre-workout. It retains the dependency-free Node/vanilla JavaScript architecture and existing Stripe integration.

## Shopping experience

- Homepage, navigation, mobile menu, brand story, bag and footer focus on Fortivor.
- Sample product records remain in the catalog as inactive archives. They do not appear in the API or storefront and cannot enter demo or Stripe checkout. Restoring an older bag removes archived items.
- `/shop`, including old category queries, and `/build-your-stack` resolve to `/product/fortivor-pre-workout`. Archived product URLs show the unavailable-page experience.
- The original Fortivor front artwork is unchanged. Its gallery adds clearly named flavor and training campaigns. The superseded, unapproved Supplement Facts is no longer linked from the product gallery.
- Only selected formula highlights are returned publicly while the production label is unapproved. Internal label-source notes, legacy label text/images, caffeine raw-material specifications and the unresolved serving weight are excluded from the product API. The new complete manufacturing specification was not copied into this repository.
- Price, inventory and label approvals remain pending. The existing demo disclosures and live-checkout gates remain in force. No live payment processing or deployment was enabled.

## Campaign imagery

Four new AI-generated advertising photographs depict illustrative adult models. They are not documented customers, testimonials, sponsored athletes or evidence of product results. Black, white and Hispanic men and women are represented across the campaign brief.

| Asset | Use | Full image dimensions |
| --- | --- | --- |
| `campaign-crew.webp` | Color group training, homepage and brand hero | 1536 × 1024 |
| `campaign-strength.webp` | Black-and-white solo strength portrait | 1024 × 1536 |
| `campaign-partners.webp` | Color partner training, editorial and product gallery | 1536 × 1024 |
| `campaign-run.webp` | Cinematic dusk running campaign, closing homepage section | 1536 × 1024 |

Each has a 768px-wide `-mobile.webp` derivative and meaningful alt text. Only the homepage hero loads eagerly; later campaign scenes load lazily. Existing Fortivor flavor artwork is retained separately from the new training imagery. No additional production dependencies or external image hosts were introduced.

The visual treatment combines charcoal, ivory, bronze and cool blue shadows, large condensed typography, direct product links, and mixed photographic formats. It respects reduced-motion preferences and preserves keyboard navigation, dialog focus containment, gallery zoom and mobile purchase controls.

## Run and validate

```bash
npm run check
npm run dev
```

With the server running on port 3000, in a separate command:

```bash
node scripts/browser-qa.mjs
```

The browser suite uses the existing external Chromium/Playwright installation. `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` and `QA_BASE_URL` are supported overrides. It covers nine check groups, including purchase and failure recovery, restored bags, legacy routes, gallery controls, keyboard interactions, and 30 page/viewport combinations across six routes at 320, 390, 768, 1024 and 1440px.

An optional accessibility audit uses external tooling without changing application dependencies:

```bash
npm install --prefix /tmp/auctoran-audit --cache /tmp/auctoran-npm-cache --no-package-lock --no-audit --no-fund axe-core@4.10.3
AXE_SOURCE=/tmp/auctoran-audit/node_modules/axe-core/axe.min.js node scripts/accessibility-qa.mjs
```

The audit checks six pages at desktop/mobile widths, bag and menu dialogs, and expanded product-information states. Automated WCAG checks do not replace manual accessibility review.

Both scripts write to ignored `storage/qa/` by default, or `QA_OUTPUT_DIR` when supplied. Reports contain current-run timestamps. They do not overwrite tracked historical reports or screenshots. Historical stack/catalog layout scripts document the previous multi-product design and are not the current acceptance suite.

Validated on October 22, 2026: all 19 automated tests passed with zero failures or skips; all nine browser groups and 30 responsive page renders passed; all 16 automated accessibility scans reported zero violations. Browser checks used Chromium with viewport emulation. Safari and physical devices were not tested.
