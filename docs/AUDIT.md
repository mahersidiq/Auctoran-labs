# Auctoran Labs V4 audit — 22 October 2026

Inspected every tracked source/configuration/test file and the media inventory. Ran the existing Node server and viewed Chromium renders at 1440×1000 and 390×844 before implementation (baseline screenshots in /workspace/scratch).

## Architecture to preserve

Dependency-free Node 20+ HTTP handler; vanilla JavaScript SPA with History API routes; two CSS layers; JSON catalog/policies. Standalone and Vercel entry points share `lib/store.mjs`. Browser localStorage cart. Server-priced Stripe-hosted Checkout, signed webhooks and Stripe-backed admin orders. No installed project dependencies or configured payment secrets. Existing deployment is GitHub/Vercel/Render, not an identified hosted Sites project; preserve these targets.

## Priorities

1. **P0 / launch integrity:** missing stock currently becomes in-stock; Fortivor has an illustrative $49.99 and unapproved formula. Add explicit price, label, and inventory approval gates. Sample brands must never enter Stripe checkout or stack recommendations. Preserve clearly marked demo transactions. Strengthen payment verification and idempotent webhook processing.
2. **P1 / conversion:** homepage repeats training image, giant slogans and product/formula sections; category access is several screens down and omits Fat Burners. Preserve imagery/palette/wordmark but consolidate into hero → direct categories → flagship → stack builder → one editorial story.
3. **P1 / Fortivor:** thumbnails work, but there is no zoom, swipe, sticky mobile purchase control, approved suggested-use section, or interactive ingredient explanation. Existing facts image is generated draft artwork, not a final Supplement Facts panel; never present it as approved packaging or invent additional product angles.
4. **P1 / discovery:** search is confined to an overlay, brand filters are broad, and price/stimulant filters and stack builder are absent. Distinguish Originals from sample Curated Brands, expose useful URL-backed filters, and provide truthful empty states. Match only verified inventory; permit an explicitly opted-in Fortivor demonstration separately.
5. **P2 / accessibility:** drawers lack focus containment/restoration and inactive dialogs remain insufficiently isolated; navigation does not move focus into new content; quantity changes redraw the whole page. Add semantic main/skip link, dialog focus handling, inline errors and touch targets.
6. **P2 / performance:** sample gallery PNGs are 2.3–2.5 MB each; facts PNG is 2.4 MB. Optimize to WebP, reserve image dimensions, remove external CSS font blocking, and lazy-load below-fold imagery. Keep the existing lightweight framework.

## Preserve / improve / consolidate / remove

- Preserve wordmark, black/ivory/muted gold, Fortivor artwork, training campaign, one classical editorial image, existing routes, cart storage key, server Stripe flow, policy pages and admin.
- Improve mobile purchasing, trust copy, data verification, filters, error recovery and keyboard interactions.
- Consolidate repeated manifesto, ritual, training, closing and formula teasers into a shorter shopping-led homepage.
- Remove invented-availability defaults and generated Supplement Facts imagery from the purchasing gallery; retain originals in the repository for provenance. No ratings, discounts, scarcity or certifications added.

## Verification plan

Run backend security/payment tests and meaningful matching-rule tests; automate journeys A–E in Chromium, including explicit demonstration/empty inventory behavior; check 1440, 1024, 390 and 430px, cart restoration/math, gallery, dialogs, filters, checkout failure and route refresh. Save final screenshots and report production blockers separately.
