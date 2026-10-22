# Auctoran architectural product collection

The five unbranded category containers have been replaced with finished Auctoran Labs front-label designs based on the owner's three architectural packaging references. Fortivor is excluded from this change.

## Completed designs

| Product | Desktop image | Mobile image |
| --- | --- | --- |
| Whey Isolate | `collection-protein.webp` | `collection-protein-mobile.webp` |
| Creatine | `collection-creatine.webp` | `collection-creatine-mobile.webp` |
| Essential Aminos | `collection-aminos.webp` | `collection-aminos-mobile.webp` |
| Daily Essentials | `collection-vitamins.webp` | `collection-vitamins-mobile.webp` |
| Thermogenic | `collection-thermogenic.webp` | `collection-thermogenic-mobile.webp` |

All ten files are in `public/assets/`. Each product has its own legible name and classification, Auctoran mark, matte black label, bronze architectural arches/columns and glossy black lid. Each image shows one complete tub in a dark studio presentation. Desktop WebPs are 1280×1280 (195–221 KB); mobile WebPs are 640×640 (55–63 KB). Original image generations are retained outside the repository.

The references informed visual design only. Their Fortivor name, formula, serving size, usage directions, certification/testing badges, barcode and QR code were not copied to these products. No new flavors, serving counts, weights or ingredient amounts were invented.

## Integration and catalog identity

The new images appear in homepage category tiles, filtered category headers, catalog cards, all five product pages, zoom dialogs and cart thumbnails. The old blank-container images are no longer used by the storefront.

Because these designs carry the owner's brand, their catalog brand is Auctoran Labs. They are identified as **Design Concepts**, rather than fabricated third-party brands. A dedicated filter shows the five designs; Auctoran Originals includes the brand collection, and Curated Brands remains available for future verified partner inventory. Existing product IDs and routes are retained so saved carts and links continue to work.

The artwork is finished as a front-label visualization. Physical product specifications and commercial approval are separate: `isConcept` identifies the designs in the UI, while `isSample` and all unapproved price/label/inventory fields remain in force. They cannot enter Stripe Checkout or live recommendations. No approved physical packaging or confirmed inventory is implied.

Fortivor's complete product record, corrected desktop/mobile front images and flat Supplement Facts SVG were compared with the parent commit and are unchanged. Its dedicated formula, warnings and two-image gallery remain exclusive to Fortivor; those amounts are not inherited by the new concepts.

## Validation and review

- `npm run check`: all 19 automated tests passed, including live-mode sample exclusion, Stripe sample rejection, signed webhooks, matching and cart restoration.
- `scripts/browser-qa.mjs`: all five shopping journeys and 13 recorded commerce checks passed, including the new concept filter and saved cart behavior.
- `scripts/visual-qa.mjs`: 16 routes at 1440, 1024, 390 and 430px (64 renders), plus discovery/filter/care/mobile zoom checks. Checks also reject the superseded blank-container images and ensure concept pages do not inherit Fortivor's formula.
- Together with commerce captures, 80 responsive page renders are recorded. Current reports: `docs/browser-results.json` and `docs/visual-results.json`.
- Current screenshots: `screenshots/refresh-catalog-1440-full.jpg`, `refresh-catalog-390-full.jpg`, `refresh-protein-390-full.jpg` and `refresh-homepage-desktop-full.jpg`.

Modified implementation: `data/products.json`, `public/src/app.js`, `public/v4.css` and the two browser QA scripts. No backend, dependency, environment or hosting configuration changes are required. Final product approvals are still needed before accepting real orders.
