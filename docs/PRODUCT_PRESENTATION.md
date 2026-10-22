# Fortivor product presentation update

The latest user-supplied packaging design and close-up of the warrior's face replace the previous Fortivor visual direction. A new studio concept image uses the black tub, gold typography, original-style sculpted face and shadowed eye, and a soft circular backlight inspired by the supplied product advertisement. The original collage and ad screenshot are not displayed on the site.

The homepage now introduces Fortivor directly with a large, fully framed product. The product gallery, catalog, cart, mobile purchase flow and stack builder use the same image. The design-detail view enlarges this exact artwork through CSS, keeping the face consistent rather than generating another interpretation or inventing a physical package angle. Primary views use centered `object-fit: contain` and square reserved frames.

Removed house/release/edition numbers and replaced them with clear product, shopping and About Us labels. The gallery's image count and stack builder's step numbers remain functional navigation.

The new packaging preview shows Blue Raspberry Watermelon, 25 servings and 450 g. These supersede the previous packaging presentation, but remain unconfirmed commercial details. Earlier ingredient amounts are retained with an explicit updated-label verification notice. No generated Supplement Facts, new clinical claims, verified stock, confirmed price or live flavor availability was invented. Live checkout approval requirements remain in force.

## Validation

- `npm run check`: all 16 backend and matching tests passed.
- `QA_BASE_URL=http://localhost:4174 node scripts/browser-qa.mjs`: all five shopping journeys plus gallery zoom/swipe, focus management, cart persistence/calculations, filtering, demo checkout and error recovery passed. 13 recorded checks and 16 responsive renders.
- Homepage, Fortivor, catalog and stack were checked at 1440, 1024, 390 and 430px. No horizontal overflow, broken loaded images or browser JavaScript exceptions. Hero shopping controls remain above the fold.
- Updated screenshots are the `studio-*.jpg` files in `screenshots/`. Previous screenshots remain as historical audit artifacts.
- Generated primary image optimized to approximately 156 KB desktop / 60 KB mobile WebP. Original generation files remain outside the source repository.

Changes are supplied on the existing review branch; production deployment and live payment credentials were not changed.
