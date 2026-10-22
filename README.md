# AUCTORAN LABS — THE HOUSE

Online store for Auctoran Labs and Fortivor pre-workout. Plain Node.js 20+, no dependencies to install.

- Storefront: Fortivor-focused homepage, product page, brand story, customer care and persistent bag. Older shop and stack-builder links lead to Fortivor.
- Payments: Stripe-hosted Checkout (cards, Apple Pay, Google Pay, Link — whatever you enable in Stripe), US shipping address collection, optional Stripe Tax
- Orders: paid orders are read straight from Stripe and shown at `/admin` with shipping addresses; shipped status and tracking are saved back to Stripe. Optional ping per order to Slack/Zapier/email via `ORDER_NOTIFY_URL` (sent from Stripe's signed webhook). Nothing is stored on the server, so it runs on Vercel or any host
- Customer pages: shipping, returns, privacy, terms, contact — text in `data/store.json`
- Safety: prices are always taken from `data/products.json` on the server, live checkout refuses to open until every required setting is in place, sample listings are hidden automatically when the store goes live

## Run locally

```bash
npm start        # http://localhost:3000
npm test         # automated tests (checkout, webhook, orders, admin, security)
npm run dev      # auto-restart on file changes
```

With no settings it runs in **demo mode**: everything works, but no payment is taken.

## Product presentation

The current direction is a single-product Fortivor storefront with a product-first hero, a homepage ingredient comparison, and the original Fortivor packaging artwork. Generated athlete scenes have been removed from rendered pages. Real training photography awaits source and license verification; see [photography status](docs/PHOTOGRAPHY.md). Earlier collection concepts are archived as inactive catalog records and are not offered in the storefront.

## Current storefront

The homepage leads to Fortivor, selected formula highlights, a sourced comparison with specific C4 Ultimate, GHOST Legend V5 and Gorilla Mode labels, brand information and customer care. [Comparison details](docs/COMPARISON.md) explain the doses and limits of the claims. The public API exposes only Fortivor and selected highlights while its production label is pending. Internal label notes and the superseded Supplement Facts are excluded from API responses. The complete new manufacturing specification has not been added to the repository. See [current design and validation](docs/FORTIVOR_FOCUS.md). Current browser screenshots and reports are generated under ignored `storage/qa/`; older reports in `docs/` and `screenshots/` document previous designs.

## V4 implementation

The existing Node/vanilla-JS architecture and hosting targets are preserved. See [audit](docs/AUDIT.md), [delivery and configuration](docs/DELIVERY.md), [browser results](docs/browser-results.json) and [screenshots](screenshots/).

The former `/build-your-stack` and `/shop` routes now resolve to the Fortivor product page. Sample products are inactive in every mode, are removed from restored bags, and cannot enter checkout. The matching utility is retained for possible future catalog expansion.

## Go live — step by step

1. **Products.** Edit `data/products.json`: set Fortivor's confirmed `priceCents` and `priceConfirmed: true`. Supply approved `supplementFactsText` or `supplementFactsImage`, `suggestedUse`, `warning`, and set `labelVerified: true` only after approval. Confirm `inventoryQuantity`, `inventoryConfirmed: true`, and `inStock: true`. The current $49.99 is illustrative. Sample partner products (`"isSample": true`) are hidden automatically in live mode; delete them or replace them with real products when you have them. Set `"inStock": false` to show a product as sold out, or `"active": false` to hide it.
2. **Policies.** Review the text in `data/store.json` (processing time, return window, policy wording) and adjust to how you actually operate. Have it checked by a professional if you can.
3. **Deploy.**
   - **Vercel:** import the GitHub repo. `vercel.json` handles everything: `public/` is served as the website and `api/index.mjs` runs the checkout/order backend. Add the settings below under *Project → Settings → Environment Variables*, then redeploy. Add your domain under *Settings → Domains*.
   - **Render:** *New → Blueprint* → pick the repo; `render.yaml` sets it up and generates an `ADMIN_TOKEN`.
   - Any other Node host works too (`npm start`, or the `Dockerfile`).
4. **Stripe test run.** In the host's environment settings set:
   - `STRIPE_SECRET_KEY=sk_test_...` (Stripe Dashboard → Developers → API keys)
   - `PUBLIC_BASE_URL=https://your-domain.com` (optional on Render/Vercel; set it once you use your own domain)
   - `ADMIN_TOKEN=` a long random password for `/admin`
   - `SHIP_US_CENTS=695` (or `0` for free shipping), optionally `FREE_SHIP_OVER_CENTS=7500`
   - `SUPPORT_EMAIL=support@your-domain.com`
   - In Stripe → Developers → Webhooks, add endpoint `https://your-domain.com/api/stripe/webhook` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, then set `STRIPE_WEBHOOK_SECRET=whsec_...`
   - Place an order with Stripe test card `4242 4242 4242 4242`, then open `/admin` with your `ADMIN_TOKEN` and check the order appears.
5. **Switch on.** Replace the key with `sk_live_...`, create the same webhook in live mode and use its `whsec_...`, set `STORE_LIVE=true`, and restart. Check `/healthz` shows `"ready":true`. If anything is missing, the server logs exactly what, and checkout stays closed with a friendly message.
6. **Stripe settings.** In the Stripe Dashboard, turn on customer email receipts (Settings → Emails) and set your public business name, support email and statement descriptor.

## Running the store day to day

- **New orders:** `/admin` lists your latest 100 orders from Stripe with the customer's shipping address. Ship it, enter tracking, click *Mark shipped* (saved on the payment in Stripe). Set `ORDER_NOTIFY_URL` to a Slack incoming webhook or a Zapier "Catch Hook" to get pinged (or emailed) for each order.
- **Refunds and disputes:** handled in the Stripe Dashboard.
- **Price or product changes:** edit `data/products.json` and redeploy.
- Stripe is the source of truth; `/admin` is your packing list. Everything is also visible in the Stripe Dashboard.

## Settings reference

See `.env.example` for every setting with an explanation. Locally, copy it to `.env`.

## Files

- `lib/store.mjs` — backend: product API, Stripe Checkout, webhook, admin orders API
- `server.mjs` — standalone server (local, Render, VPS); `api/index.mjs` — Vercel entry
- `public/` — the website: `index.html`, `src/app.js` (storefront UI), `styles.css`, `enhancements.css`, `assets/` (images)
- `data/products.json` — catalog and prices
- `data/store.json` — store details and policy page text
- `test/` — automated tests (`npm test`)
- `vercel.json`, `render.yaml`, `Dockerfile` — deployment
