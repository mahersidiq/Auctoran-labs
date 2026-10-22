# Auctoran Labs V4 delivery

Implemented directly in the existing repository, preserving dependency-free Node, vanilla JavaScript, existing routes, Stripe server integration, admin and Vercel/Render hosting configuration. No production deployment performed.

Latest imagery and copy changes: [Fortivor product presentation](PRODUCT_PRESENTATION.md). The new packaging shows Blue Raspberry Watermelon, 25 servings and 450 g, with commercial details still awaiting approval.

## Design and commerce

- Full-width monochrome campaign hero with the requested headline/copy and both shopping CTAs above the fold at the four tested widths. Seven direct category shortcuts immediately follow.
- Shorter homepage: flagship merchandising, a functional stack-builder entry, one asymmetrical classical/training story and collection links. Retained the wordmark, supplied campaign/product artwork, restrained gold and warm ivory.
- Fortivor: front artwork, existing label close-up and lifestyle image; functional thumbnails, swipe, native-dialog zoom, quantities, mobile purchase bar, information anchors, expandable ingredient explanations, label/use/safety/shipping sections and FAQs. Generated draft Supplement Facts imagery and invented package angles are excluded.
- Search and URL-backed category, brand, price, verified-caffeine and sort controls; compact mobile filtering, clear availability and empty states. Originals are distinct from sample Curated Brands.
- Three-step stack matching with goal/category/stimulant/budget preferences, visible rules, quantities, removal, selection, individual/bulk cart actions and combined-budget validation. At most one caffeinated product; no sample brand recommendations. Unknown stimulant data is excluded.
- Preserved cart storage key. Restored items are normalized, duplicate IDs merged and quantities capped. Demo checkout keeps the bag and never claims a real paid order. Inline checkout errors support retry.
- Server validates prices, IDs, quantities and confirmed inventory; rejects samples from Stripe, gates live sales on product approvals, requires signed-webhook payment confirmation before fulfillment, coalesces simultaneous webhook processing and persists markers in Stripe. Notification receivers receive a stable per-order idempotency key.
- Skip link, page-focus handling, inactive-dialog isolation, modal keyboard containment and restoration, native disclosures, accessible controls and reduced-motion support.
- Optimized five 2.3–2.5 MB sample images to 228–244 KB WebP each; added mobile image derivatives, image dimensions and below-fold lazy loading. Removed blocking Google Fonts CSS import. Product structured data only emits for verified products.

## Validation actually run

- `npm run check`: JavaScript syntax and 16 backend/matching tests passed before final UI refinements. See current final command result in the handoff.
- `node scripts/browser-qa.mjs`: journeys A–E, default/no-match and stimulant-free builder behavior, explicit demo matching, cart math/restoration/removal, checkout failure/retry, cancellation, gallery thumbnails/zoom/swipe, mobile bar, keyboard focus, search/filter/sort and route refresh.
- Chromium renders at 1440, 1024, 390 and 430px: homepage, product, catalog and stack. No horizontal overflow or broken loaded images; hero CTAs above fold. See `browser-results.json` for final results.
- Screenshots in `screenshots/`: all four routes at all four widths, full desktop homepage and full mobile Fortivor page.
- No real Stripe account transaction, deployed-host integration, Safari/iOS device test, field Core Web Vitals or formal accessibility certification was performed. Payment API tests use a local mock Stripe service; browser checkout uses demo mode.

## Production versus demonstration

The UI, cart and deterministic matching are implemented. The supplied catalog is not launch-ready inventory. Fortivor's $49.99 is a preview price; stock, final physical packaging and approved label are unconfirmed. Partner listings remain samples. Live matching therefore returns a truthful empty state until verified products exist. Preview matching uses only the explicitly opted-in Fortivor concept.

## Launch blockers and configuration

1. Approve Fortivor's price, formula, final Supplement Facts, suggested use, caffeine/allergen warnings and physical product photos. Update `data/products.json`: `priceConfirmed`, `labelVerified`, `supplementFactsText` or `supplementFactsImage`, `suggestedUse`, `warning`, `inventoryConfirmed`, `inventoryQuantity`, and `inStock`. Verify the five stated amounts: 8,000 mg citrulline; 3,200 mg beta-alanine; 300 mg caffeine; 200 mg alpha-GPC; 100 mg theanine. The updated packaging preview shows Blue Raspberry Watermelon / 25 servings. Confirm the final product details before sale.
2. For matching/filtering, provide verified `caffeineMg`, `caffeineVerified`, `stimulant` and `stimulantVerified` data. A caffeine-free value alone does not prove stimulant-free. Add only authorized supplier products with real images, prices, approved labels and stock. Samples remain excluded from live catalog and Stripe.
3. Review shipping/return/privacy/terms text in `data/store.json`. Configure the server environment using `.env.example`: `PUBLIC_BASE_URL`, `SUPPORT_EMAIL`, shipping rates, `ADMIN_TOKEN`, and Stripe secret/webhook keys. Keep secrets in host settings; never commit them. Retain `STORE_LIVE=false` until approval.
4. Configure Stripe webhook `/api/stripe/webhook` for Checkout completion and async payment success/failure. Test real Stripe test-mode redirects, receipts, cancellation, signed webhook arrival and fulfillment gating before switching to live credentials.
5. Inventory is validated against the server's catalog snapshot; this repository has no transactional inventory reservation/decrement service. Connect an authoritative inventory system before accepting concurrent live sales. Stripe metadata plus the in-process lock does not provide a distributed exactly-once notification guarantee: the notification/fulfillment receiver must deduplicate the supplied per-order key or use a transactional event ledger.
6. Confirm rights/provenance and physical-product fidelity for the retained supplied campaign/artwork. No new photography, certifications, customer reviews or partner authorization were fabricated.

Run locally with `npm start` (http://localhost:3000). Run backend/rule checks with `npm run check`. Optional browser QA uses preinstalled Chromium/Playwright, configurable via `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `QA_BASE_URL`; no production dependencies were added. Deploy using the repository's existing Vercel/Render setup after resolving the blockers.

## Files

Modified: `data/products.json`, `lib/store.mjs`, `public/index.html`, `public/src/app.js`, `public/styles.css`, `test/store.test.mjs`, `README.md`.

Created: `public/v4.css`, `public/src/matching.js`, `test/matching.test.mjs`, `scripts/browser-qa.mjs`, `docs/AUDIT.md`, `docs/DELIVERY.md`, `docs/browser-results.json`, `screenshots/`, five optimized sample-gallery WebPs and four mobile image derivatives in `public/assets/`.
