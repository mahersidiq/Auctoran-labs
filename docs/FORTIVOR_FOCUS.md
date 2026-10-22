# Fortivor-focused storefront

The store launches around one product: Fortivor Blue Raspberry Watermelon pre-workout. It retains the dependency-free Node/vanilla JavaScript architecture and existing Stripe integration.

## Shopping experience

- Homepage, navigation, mobile menu, brand story, bag and footer focus on Fortivor.
- Sample product records remain in the catalog as inactive archives. They do not appear in the API or storefront and cannot enter demo or Stripe checkout. Restoring an older bag removes archived items.
- `/shop`, including old category queries, and `/build-your-stack` resolve to `/product/fortivor-pre-workout`. Archived product URLs show the unavailable-page experience.
- The original Fortivor front artwork is unchanged. Its gallery contains the front artwork and a clearly named flavor campaign. Generated training scenes and the superseded, unapproved Supplement Facts are no longer linked from the product gallery.
- Only selected formula highlights are returned publicly while the production label is unapproved. Internal label-source notes, legacy label text/images, caffeine raw-material specifications and the unresolved serving weight are excluded from the product API. The new complete manufacturing specification was not copied into this repository.
- Price, inventory and label approvals remain pending. The existing demo disclosures and live-checkout gates remain in force. No live payment processing or deployment was enabled.

## Product-first design and comparison

The homepage now opens with the Fortivor tub, an explicit high-stim pre-workout description, the flavor and a direct product link. The dark charcoal and bronze treatment, condensed product name, clear amounts and plain-language copy replace the earlier wellness-style campaign layout. Mobile ordering puts the product and shopping link in the first viewport.

The comparison appears directly below the hero highlights. It calls out the proposed 33% L-citrulline quantity advantage over the compared GHOST Legend V5 serving and twice the betaine quantity of the compared C4 Ultimate serving. The table also preserves Gorilla Mode's higher amounts at its two-scoop maximum, explains its smaller dose, and links each official product page and label. These are selected ingredient comparisons, not proof of superior workout results. See [comparison sources and scope](COMPARISON.md).

Generated athlete scenes have been removed from every rendered page and the product gallery. Earlier files remain archived. The supplied Fortivor pack and product/fruit artwork remain in use. No new real athlete photographs have been imported: the environment currently blocks the proposed Pexels sources. The licensed-photography component stays inactive until provenance can be verified. See [photography status and source requirements](PHOTOGRAPHY.md).

No production dependencies or external runtime image hosts were introduced. The design respects reduced-motion preferences and preserves keyboard navigation, dialog focus containment, gallery zoom and mobile purchase controls. The comparison table supports horizontal scrolling and keyboard access at narrow widths.

## Run and validate

```bash
npm run check
npm run dev
```

With the server running on port 3000, in a separate command:

```bash
node scripts/browser-qa.mjs
```

The browser suite uses the existing external Chromium/Playwright installation. `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` and `QA_BASE_URL` are supported overrides. It covers ten check groups, including homepage comparison claims, sources and doses, purchase and failure recovery, restored bags, legacy routes, gallery controls, keyboard interactions, and 30 page/viewport combinations across six routes at 320, 390, 768, 1024 and 1440px.

An optional accessibility audit uses external tooling without changing application dependencies:

```bash
npm install --prefix /tmp/auctoran-audit --cache /tmp/auctoran-npm-cache --no-package-lock --no-audit --no-fund axe-core@4.10.3
AXE_SOURCE=/tmp/auctoran-audit/node_modules/axe-core/axe.min.js node scripts/accessibility-qa.mjs
```

The audit checks six pages at desktop/mobile widths, bag and menu dialogs, expanded product-information states and the expanded homepage comparison. Automated WCAG checks do not replace manual accessibility review.

Both scripts write to ignored `storage/qa/` by default, or `QA_OUTPUT_DIR` when supplied. Reports contain current-run timestamps. They do not overwrite tracked historical reports or screenshots. Historical stack/catalog layout scripts document the previous multi-product design and are not the current acceptance suite.

Validated on October 22, 2026: all 22 automated tests passed with zero failures or skips; all ten browser groups and 30 responsive page renders passed; all 18 automated accessibility scans reported zero violations. Some contrast checks require manual review. Browser checks used Chromium with viewport emulation. Safari and physical devices were not tested.
