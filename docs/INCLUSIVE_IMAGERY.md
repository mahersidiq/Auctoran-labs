# Training imagery and product-image improvements

The storefront now shows women prominently alongside men in the same black-and-white training campaign. Two generated photographs show a woman completing a barbell deadlift and another woman preparing a wrist wrap between sets. Faces, hands and movements remain clearly framed. The homepage, catalog, About page, stack builder, product-page closing sections and customer-care pages use this photography.

The standalone Roman-column photograph has been removed from every rendered page. Homepage editorial photography keeps its asymmetrical layout, while both athlete images retain their complete landscape framing. About-page copy now speaks to individual training goals and preparation. The black, ivory and muted-gold identity remains in place.

## Consistent product photography

The five architectural collection concepts have new studio photographs with the same charcoal background, cool silver halo and smooth dark floor as Fortivor. Their existing product names, classifications and black-and-bronze label direction are retained. No formulas, serving counts, claims or certification marks were added.

| Product | Current desktop image | Mobile image |
| --- | --- | --- |
| Whey Isolate | `collection-protein-studio.webp` | `collection-protein-studio-mobile.webp` |
| Creatine | `collection-creatine-studio.webp` | `collection-creatine-studio-mobile.webp` |
| Essential Aminos | `collection-aminos-studio.webp` | `collection-aminos-studio-mobile.webp` |
| Daily Essentials | `collection-vitamins-studio.webp` | `collection-vitamins-studio-mobile.webp` |
| Thermogenic | `collection-thermogenic-studio.webp` | `collection-thermogenic-studio-mobile.webp` |

Product WebPs are 1280×1280 at 167–176 KB and 640×640 at 48–53 KB. Training photographs are `editorial-women-strength.webp` and `editorial-women-preparation.webp`, each with a mobile version: 1280×853 at approximately 121–124 KB and 640×427 at 42–43 KB. Original generations remain outside the repository. The previous photo files remain available for older cached clients but are not used in the current storefront.

Fortivor's approved desktop/mobile front photographs, flat Supplement Facts SVG and complete product record were compared with the parent commit and are unchanged. All other product metadata is unchanged except image paths. Concepts remain clearly identified and excluded from live sales and recommendations until approved.

## Larger images and usable zoom

- Category pages replace the old 150px mobile product strip with a full-width, centered studio stage. The photo links directly to the relevant product page.
- Catalog results containing one product use a larger card rather than half an empty mobile grid.
- Responsive source sizes reflect these larger displays, including high-density phones.
- Clicking a product-gallery image opens a centered enlargement using the full-resolution source. Scroll or swipe to inspect it, or select **Full view** for the complete image and **Zoom in** to return to detail.
- The mobile image viewer fills the available viewport. The close button, Escape key, keyboard focus containment and focus restoration work with the native dialog.
- The HTML references revised CSS/JavaScript URLs and the new product photos have new filenames, so older cached files do not hide this update.

## Files and configuration

Implementation changes: `public/src/app.js`, `public/v4.css`, `public/index.html`, and image paths in `data/products.json`. Fourteen optimized image files were added to `public/assets/`. `scripts/visual-qa.mjs` now covers the two category routes, retired-image exclusion, larger product framing, all six zoom galleries and high-density image selection. README and collection documentation link to this record.

No dependency, framework, environment-variable, payment, server or hosting changes are required. Use the established Node/Vercel deployment. The store remains a preview: real inventory, prices, final label/serving-size corrections, approved usage directions and operational settings still need approval before real sales. This visual update does not change those launch gates.

## Validation performed

- `npm run check`: all 19 automated tests passed, including checkout, signed/idempotent webhooks, sample exclusion, matching, cart restoration and Fortivor formula consistency.
- `QA_BASE_URL=http://localhost:4174 node scripts/browser-qa.mjs`: all 13 recorded checks passed, including journeys A–E, cart persistence/calculations, checkout errors, gallery swipe, keyboard navigation and 16 responsive page renders.
- `QA_BASE_URL=http://localhost:4174 node scripts/visual-qa.mjs`: all 18 routes at 1440, 1024, 390 and 430px passed (72 renders), plus seven visual/discovery checks. These include 24 product-gallery checks, all six category links, correct concept filtering and full-resolution category images on a 3× density phone.
- No browser exceptions, broken images or horizontal overflow were observed in those runs. Automated checks also verify product bounds and contrast for selected headings/navigation. This is Chromium coverage; no Core Web Vitals score or Safari device test is claimed.
- Final captures were visually inspected for full product framing, matching studio backdrops and clear athlete presentation.

Reports: [commerce results](browser-results.json) and [visual results](visual-results.json).

Review captures:

- [Desktop homepage](../screenshots/refresh-homepage-desktop-full.jpg)
- [Mobile homepage](../screenshots/inclusive-homepage-mobile-full.jpg)
- [Desktop athlete editorial](../screenshots/inclusive-training-1440.jpg)
- [Mobile athlete editorial](../screenshots/inclusive-training-390.jpg)
- [Mobile category product stage](../screenshots/refresh-pre-workout-category-390-full.jpg)
- [Mobile catalog](../screenshots/refresh-catalog-390-full.jpg)
- [Mobile enlarged product](../screenshots/product-enlarged-mobile.jpg)
- [Mobile full-image option](../screenshots/product-full-view-mobile.jpg)
- [Desktop About page](../screenshots/refresh-about-1440-full.jpg)
