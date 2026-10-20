# AUCTORAN LABS — THE HOUSE

An interactive, responsive e-commerce storefront for Auctoran Labs. No install dependencies beyond **Node.js 20+**. The project includes an editorial homepage, catalog, detail pages, filters/search, persistent cart, and a secure server-side Stripe Checkout integration.

## What changed in v3

- Uses higher-resolution black-and-white lifting photography and an editorial image combining modern training with classical sculpture.
- Makes Fortivor easier to shop from the homepage, with a clear purchase action and preview price.
- Brings the formula into view early and adds a detailed five-ingredient breakdown, caution notice, gallery, and FAQs on the product page.
- Improves desktop and mobile spacing and navigation.
- Keeps partner listings labeled as sample data instead of inventing manufacturer claims or reviews.

For a self-contained browser demonstration with no server, open the separately supplied `Auctoran_Labs_Interactive_v3.html`. That file runs a **demo checkout only**. For real Stripe Checkout integration, use this Node.js project.

## Run the storefront

```bash
cd Auctoran-labs
npm start
```

Open `http://localhost:3000`. Other scripts:

```bash
npm run dev      # auto-restart the server on file changes
npm run check    # syntax validation
```

**Out of the box this is a demo storefront, not a live shop.** You can browse, add items, and complete a clearly labeled no-payment demonstration checkout. No money is collected and no order is submitted in demo mode.

## What works

- Desktop + mobile homepage with a distinct editorial treatment of Auctoran's packaging.
- Product listing, category navigation, Auctoran Originals / Partner Edit filters, price/name sorting, search.
- Individual product pages with formula information, quantity selection, an expanded three-image Fortivor gallery, and four fact-based FAQs.
- Persistent shopping cart (local browser storage), cart drawer, quantity updates, totals and removal.
- Stripe Checkout session endpoint with server-side product/pricing validation, quantity limits and rate limiting.
- Shipping address collection; configurable US shipping fees and optional Stripe Tax.
- Stripe Checkout payment-status verification on return and signature-verified webhook endpoint.
- Sensitive Stripe keys remain on the server. The browser does **not** collect payment card numbers.
- Sample product placeholders prominently identified, with live sales guardrails.

## Connect Stripe Checkout (test mode)

1. Copy `.env.example` to `.env`.
2. Put your Stripe **secret test key** in `STRIPE_SECRET_KEY=sk_test_...`.
3. Set `PUBLIC_BASE_URL=http://localhost:3000` for local testing, or your real HTTPS domain for a public deployment.
4. Optionally set `SHIP_US_CENTS=0` for **free** US shipping, or another validated amount in cents. To use Stripe Tax, configure Stripe Tax in your Stripe account and set `STRIPE_AUTOMATIC_TAX=true`.
5. Restart the server (`npm start`). Add any item to your bag, proceed to checkout, and Stripe will open in test mode.
6. Use Stripe's published **test card numbers only** in test mode. Never use a real card or put keys in browser source.
7. Configure a Stripe webhook pointing to `https://YOUR-DOMAIN/api/stripe/webhook` and set the corresponding `STRIPE_WEBHOOK_SECRET=whsec_...`.

### Live-mode safeguards

`STORE_LIVE=false` by default. To enable live payments, the application additionally requires:

- A valid `sk_live_...` Stripe secret key.
- `STORE_LIVE=true` in `.env`.
- `SHIP_US_CENTS` explicitly configured (including `0` if shipping is free).
- **No sample partner listings remaining in `data/products.json`.** Every real product must have supplier-verified information.

The checkout server calculates line-item prices from `data/products.json` and ignores prices posted by the browser. There are no hard-coded card numbers or example Stripe credentials. However, this code is a **starter storefront**, not a production-validated commerce operation. Do not launch without completing the checklist below.

## Customize catalog

Edit `data/products.json`. Each entry has `id`, `slug`, `name`, `fullName`, `brand`, `category`, `categoryKey`, `goal`, `description`, `details`, `size`, `flavor`, `priceCents`, `isOwn`, `isSample`, `image`, `eyebrow`, and optional `formula`, `imageDetail`, and `warning`. Images can be placed in `assets/` and referenced as `/assets/your-image.jpg`.

**Important:** `Fortivor` uses the product photo you provided. Its **$49.99 price is an illustrative placeholder**; you have not supplied an official retail price. Formula amounts are transcribed from your image and are **not independently certified**. Confirm them with the finished manufactured Supplement Facts label, any required warnings, and a compliant marketing review before going live.

All other items are clearly marked **sample third-party listings**, intentionally using illustrative bottle art, generic descriptions, and placeholder prices. Replace them with real authorized third-party SKUs, images you have rights to use, inventory data, and manufacturer-approved facts before live launch. These products are **not** represented as available from specific manufacturers.

## Launch checklist — do not skip

- [ ] Confirm ownership/usage rights for photography, fonts, icons, and all supplier logos/product images.
- [ ] Verify Fortivor SKU, actual stock, size, variants, final label, pricing, tax category, and supplement advertising compliance.
- [ ] Replace/remove *all* placeholder products with authorized suppliers' SKUs, verified descriptions, real prices and current stock.
- [ ] Decide which products are genuinely in stock and implement an inventory/stock system before accepting live orders.
- [ ] Confirm shipping rates, carrier rules, fulfillment provider, destinations, cutoffs and processing estimates.
- [ ] Set up taxes (Stripe Tax or equivalent) as appropriate for your jurisdictions.
- [ ] Publish accurate shipping, returns, refund, privacy, contact, and terms pages; replace the current `Shipping & Returns` draft.
- [ ] Provide a real support contact address and customer-service process.
- [ ] Verify transactional emails, payment events, fraud handling, refunds, disputes and Stripe Dashboard access.
- [ ] Implement real order fulfillment and inventory reservation keyed to verified Stripe webhook events. The starter currently logs completed checkout events only.
- [ ] Set HTTPS and `PUBLIC_BASE_URL` to your live HTTPS origin, add `STRIPE_WEBHOOK_SECRET`, run Stripe test payments, then test cancellations/failures.
- [ ] Test on iPhone/Android, keyboards and screen readers, and verify performance and search engine metadata.
- [ ] Enable `STORE_LIVE=true` only after readiness checks.

## Deployment

You can deploy this project as a **Node.js web service** to a platform such as Render, Railway, Fly.io, or your own VPS. Set the start command to `npm start`, the HTTP port to 3000 (or use the provider's `PORT`), add environment variables privately, and configure HTTPS/DNS. A `Dockerfile` is provided. It is **not a drop-in static site** because Stripe checkout runs server-side.

## Files

- `server.mjs` — HTTP service, product API, validation, Stripe Checkout + webhook.
- `src/app.js` — client-side UI, routes, search/filter, cart, checkout redirects.
- `styles.css` — original responsive editorial system.
- `enhancements.css` — v3 layout polish, training-image treatment, product ingredient panels, FAQ, and mobile refinements.
- `data/products.json` — centrally priced product catalog, shared by UI and backend.
- `assets/` — brand imagery, favicon.
- `.env.example` — safe configuration template, no actual secrets.

## Payments note

In demo mode, the checkout success page is **not** proof of payment. In Stripe mode, payment is verified against Stripe after redirect. For actual fulfillment, subscribe to validated Stripe webhooks and manage idempotent order creation in a database or a fulfillment system; a successful browser redirect alone is not sufficient.
