# Fortivor product presentation update

The latest user-supplied packaging design and close-up of the warrior's face replace the previous Fortivor visual direction. A new studio concept image uses the black tub, gold typography, original-style sculpted face and shadowed eye, and a soft circular backlight inspired by the supplied product advertisement. The original collage and ad screenshot are not displayed on the site.

The homepage now introduces Fortivor directly with a large, fully framed product. The product gallery, catalog, cart, mobile purchase flow and stack builder use the same image. The homepage design-detail view enlarges this exact artwork through CSS, keeping the face consistent rather than generating another interpretation or inventing a physical package angle. Primary views use centered `object-fit: contain` and square reserved frames.

Removed house/release/edition numbers and replaced them with clear product, shopping and About Us labels. The gallery's image count and stack builder's step numbers remain functional navigation.

The flavor remains **Blue Raspberry Watermelon**, as requested. The corrected front rendering is unchanged. Following the owner's final clarification, the gallery contains exactly **two views**: the corrected front and a flat black-and-gold Supplement Facts panel. There is no directions image, back-label brand panel or placeholder. Ingredient text is typeset directly from catalog data rather than image-generated, and is also available as an accessible HTML table. Thumbnails, swipe and zoom work for both views.

## Current formula and approvals

The owner confirmed the ingredient amounts in the supplied packaging image and subsequently supplied product copy confirming approximately **355 mg total caffeine**. The current ten-ingredient list replaces the earlier five-ingredient concept. Caffeine is 300 mg anhydrous plus approximately 55 mg from 250 mg guarana extract standardized to 22% caffeine. Alpha-GPC is listed as 300 mg of a 50% preparation. L-theanine is absent from the supplied formula. No clinical or guaranteed performance claims were copied from the marketing draft.

The supplied image also shows 25 servings, 450 g and an 18 g scoop. Listed ingredient amounts total 18.65 g before flavoring, so the serving size and final container serving count remain unresolved. The owner has not provided a correction. The flat facts image faithfully reproduces the supplied serving-size line and count, stored separately in `sourceLabel`. Its gallery caption identifies the serving size as under review. The purchase panel and accessible HTML table explicitly mark serving size/count as awaiting confirmation. `factsVerified` records the ingredient source; `labelVerified` remains false.

The owner explicitly asked to ignore the directions photo and retain only the front and facts. Exact usage directions have not been supplied; the Suggested Use disclosure therefore provides no dosing guidance. Before launch, enter approved text in `suggestedUse` and set `directionsVerified: true`. Resolve the serving-mass discrepancy, update `servingSize`, `servingSizeGrams`, the serving approval fields and `sourceLabel`, then run `node scripts/build-product-labels.mjs` before approving the complete label.

The facts SVG is a digital packaging reference, not production packaging artwork or a regulatory label approval. Final physical packaging, price and stock remain unconfirmed; live checkout approval requirements are unchanged. The $49.99 price is still illustrative. No live inventory, partner authorization, reviews or certifications were fabricated.

## Validation

- `npm run check`: all 19 backend, matching and product-facts tests passed.
- `QA_BASE_URL=http://localhost:4174 node scripts/browser-qa.mjs`: all five shopping journeys plus gallery zoom/swipe, focus management, cart persistence/calculations, filtering, demo checkout and error recovery passed. 13 recorded checks and 16 responsive renders.
- Homepage, Fortivor, catalog and stack were checked at 1440, 1024, 390 and 430px. No horizontal overflow, broken loaded images or browser JavaScript exceptions. Hero shopping controls remain above the fold.
- Updated screenshots are the `studio-*.jpg` files in `screenshots/`, plus `flat-facts-desktop.jpg` and `flat-facts-mobile.jpg`. Previous screenshots remain as historical audit artifacts.
- Generated primary image optimized to approximately 156 KB desktop / 60 KB mobile WebP. Original generation files remain outside the source repository.

Changes are supplied on the existing review branch; production deployment and live payment credentials were not changed.
