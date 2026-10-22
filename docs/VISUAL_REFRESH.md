# Complete storefront visual refresh

The mobile screenshot exposed an implementation problem, not just a weak image: the second Fortivor view was enlarged to 160%, offset and clipped inside a nested span that also inherited caption positioning. Other products still displayed cropped panels from older three-image packaging sheets. About used a narrow portrait as a wide background and heavily darkened it.

## Implemented

- Removed the enlargement/offset rendering branch and its CSS. Both homepage Fortivor presentations now display the complete, centered, corrected front. The warrior artwork, Blue Raspberry Watermelon flavor and two-image product gallery (front + flat Supplement Facts) remain intact.
- Created eight new images: five matching category studio still lifes, a monochrome deadlift campaign, a wrist-wrap preparation image and a natural-light architectural study. Each has a 1280px WebP and a 640px mobile derivative; original generations remain outside the repository. Typical mobile files are 19–52 KB. No invented manufacturer branding is applied to partner samples.
- Added six photographic category links to the homepage. Refined the flagship formula presentation, architectural/training editorial section and photographic stack-builder entry.
- Replaced all five old sample product image sheets with single, fully framed studio images in the catalog, product pages and bag. Removed inactive paging and redundant thumbnails from one-image sample galleries. Sample listings remain visibly identified; imagery is illustrative, not verified supplier packaging.
- Updated the catalog and stack-builder headers, all product page closing sections, About, shipping, returns, privacy, terms, contact and the empty bag. Customer care shares readable sections, active navigation and restrained supporting imagery.
- Added image dimensions, responsive sources and context-appropriate sizes for cards, product presentations and cart thumbnails. Below-fold imagery is lazy loaded. Existing reduced-motion behavior, cart storage, filters, recommendation rules, checkout and Stripe safeguards are preserved.
- Visual review corrected foreground inheritance on ivory sections and image heights that could otherwise stretch editorial layouts. The completed pages use crisp images and readable text without overlaid slogans or blurred photo backgrounds.

## Verification

- `npm run check`: 19 automated tests, including checkout, signed webhooks, inventory gates, matching, cart restoration and supplied product facts.
- `QA_BASE_URL=http://localhost:4174 node scripts/browser-qa.mjs`: 13 checks and 16 responsive renders covering journeys A–E, filtering, keyboard focus, real gallery zoom, swipe, cart calculations, cancellation and checkout recovery.
- `QA_BASE_URL=http://localhost:4174 node scripts/visual-qa.mjs`: 16 customer routes at 1440, 1024, 390 and 430px (64 renders). Checks image loading and bounds, heading/navigation contrast, old image removal, horizontal overflow, six category links, customer care navigation and actual mobile label enlargement.
- Results: [commerce checks](browser-results.json), [visual checks](visual-results.json). No browser exceptions or missing assets were observed. These are Chromium checks, not Safari/device certification or field Core Web Vitals measurements.

## Review images

Current captures use `screenshots/refresh-*`. In particular:

- `refresh-homepage-desktop-full.jpg`
- `refresh-fortivor-framing-mobile.jpg`
- `refresh-catalog-1440-full.jpg` and `refresh-catalog-390-full.jpg`
- `refresh-protein-390-full.jpg`
- `refresh-about-1440-full.jpg` and `refresh-about-390-full.jpg`
- `refresh-shipping-1440-full.jpg` and `refresh-shipping-390-full.jpg`

## Source and configuration

Modified: `public/src/app.js`, `public/v4.css`, `data/products.json`, `scripts/browser-qa.mjs`, `README.md` and current QA results. Added: 16 optimized image files, `scripts/visual-qa.mjs`, `docs/visual-results.json`, this document and the new screenshots. No framework, dependency, backend, environment variable or hosting migration was introduced. Existing Vercel/Render configuration applies.

New images are generated campaign/category artwork. Fortivor's corrected front and facts assets are unchanged. Partner samples still require actual authorized supplier products, prices, stock and photography before sale. The unresolved serving-size discrepancy, missing approved directions, unconfirmed price/inventory and operational/payment launch requirements described in [product presentation](PRODUCT_PRESENTATION.md) and [delivery](DELIVERY.md) remain. The refresh does not turn demonstration items into saleable inventory.
