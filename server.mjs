// Standalone server for Render, Railway, Fly, a VPS or local use. On Vercel, api/index.mjs is used instead.
import http from 'node:http';
import handler, { LIVE_PROBLEMS, startupInfo as info } from './lib/store.mjs';

const server = http.createServer(handler);
server.listen(info.PORT, () => {
  console.log(`AUCTORAN storefront: ${info.BASE} (port ${info.PORT}) | checkout: ${info.MODE.toUpperCase()} | store live: ${info.STORE_LIVE}`);
  if (info.MODE !== 'demo' && !info.hasWebhookSecret) console.warn('WARNING: STRIPE_WEBHOOK_SECRET is not set; order notifications will not be sent.');
  if (info.MODE !== 'demo' && !info.hasBaseUrl) console.warn('WARNING: PUBLIC_BASE_URL is not set; Stripe will redirect customers to localhost.');
  if (info.STORE_LIVE && LIVE_PROBLEMS.length) console.warn('LIVE CHECKOUT BLOCKED until fixed:\n - ' + LIVE_PROBLEMS.join('\n - '));
  if (!info.hasAdmin) console.warn('NOTE: ADMIN_TOKEN is not set; the /admin order page is disabled.');
});
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
