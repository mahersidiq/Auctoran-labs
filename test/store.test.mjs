import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEBHOOK_SECRET = 'whsec_test_secret';
const ADMIN_TOKEN = 'admin-test-token';

// A fake Stripe API that records what the store sends it.
const stripeCalls = [];
const sessions = new Map();
const intents = new Map();
const withIntent = s => ({ ...s, payment_intent: intents.get(s.payment_intent) });
const notifications = [];
let stripeServer, notifyServer, stripeUrl, notifyUrl;

function listen(handler) {
  return new Promise(resolve => { const s = http.createServer(handler); s.listen(0, () => resolve(s)); });
}
async function readBody(req) { let b = ''; for await (const c of req) b += c; return b; }

async function startStore(extraEnv) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT,
    env: { PATH: process.env.PATH, PORT: String(port), STRIPE_API_BASE: stripeUrl, PUBLIC_BASE_URL: `http://localhost:${port}`, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stderr.on('data', d => { output += d; });
  await new Promise((resolve, reject) => {
    child.stdout.on('data', d => { output += d; if (output.includes('AUCTORAN storefront')) resolve(); });
    child.on('exit', code => reject(new Error(`server exited ${code}: ${output}`)));
  });
  const base = `http://localhost:${port}`;
  return { base, output: () => output, stop: () => child.kill() };
}
const post = (url, body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
function signedWebhook(base, event, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return fetch(`${base}/api/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t},v1=${sig}` }, body: payload });
}

let demo, testMode;
before(async () => {
  stripeServer = await listen(async (req, res) => {
    const body = await readBody(req);
    stripeCalls.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: new URLSearchParams(body) });
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'POST' && req.url === '/v1/checkout/sessions') {
      const form = new URLSearchParams(body);
      const id = 'cs_test_' + crypto.randomBytes(8).toString('hex');
      const session = {
        id, url: `https://checkout.stripe.com/c/pay/${id}`, created: Math.floor(Date.now() / 1000), livemode: false,
        payment_status: 'paid', status: 'complete', currency: 'usd', amount_subtotal: 9998, amount_total: 10998,
        total_details: { amount_shipping: 1000, amount_tax: 0 }, payment_intent: 'pi_' + id,
        metadata: { store: form.get('metadata[store]'), items: form.get('metadata[items]') },
        customer_details: { email: 'buyer@example.com', name: 'Test Buyer', phone: '+15555550100' },
        shipping_details: { name: 'Test Buyer', address: { line1: '1 Main St', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' } }
      };
      sessions.set(id, session);
      intents.set(session.payment_intent, { id: session.payment_intent, status: 'succeeded', metadata: { store: form.get('payment_intent_data[metadata][store]') } });
      return res.end(JSON.stringify(session));
    }
    const u = new URL(req.url, 'http://stripe');
    if (req.method === 'GET' && u.pathname === '/v1/checkout/sessions') return res.end(JSON.stringify({ data: [...sessions.values()].reverse().map(withIntent) }));
    const match = u.pathname.match(/^\/v1\/checkout\/sessions\/(cs_\w+)$/);
    if (req.method === 'GET' && match && sessions.has(match[1])) { const s = sessions.get(match[1]); return res.end(JSON.stringify(u.searchParams.getAll('expand[]').includes('payment_intent') ? withIntent(s) : s)); }
    const pi = u.pathname.match(/^\/v1\/payment_intents\/(pi_\w+)$/);
    if (req.method === 'POST' && pi && intents.has(pi[1])) {
      const intent = intents.get(pi[1]);
      for (const [k, v] of new URLSearchParams(body)) { const m = k.match(/^metadata\[(\w+)\]$/); if (m) intent.metadata[m[1]] = v; }
      return res.end(JSON.stringify(intent));
    }
    res.statusCode = 404; res.end(JSON.stringify({ error: { message: 'No such session' } }));
  });
  stripeUrl = `http://localhost:${stripeServer.address().port}`;
  notifyServer = await listen(async (req, res) => { notifications.push(JSON.parse(await readBody(req))); res.end('ok'); });
  notifyUrl = `http://localhost:${notifyServer.address().port}/hook`;
  demo = await startStore({});
  testMode = await startStore({ STRIPE_SECRET_KEY: 'sk_test_123', STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET, SHIP_US_CENTS: '1000', ADMIN_TOKEN, ORDER_NOTIFY_URL: notifyUrl, TRUST_PROXY: 'true' });
});
after(() => { demo?.stop(); testMode?.stop(); stripeServer?.close(); notifyServer?.close(); });

test('pages and APIs load', async () => {
  for (const p of ['/', '/shop', '/product/fortivor-pre-workout', '/info/shipping', '/contact', '/admin', '/styles.css', '/src/app.js', '/assets/fortivor.jpg', '/robots.txt']) {
    assert.equal((await fetch(demo.base + p)).status, 200, p);
  }
  const page = await fetch(demo.base + '/');
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  const { products } = await (await fetch(demo.base + '/api/products')).json();
  assert.ok(products.find(p => p.id === 'fortivor-pre-workout'));
  const config = await (await fetch(demo.base + '/api/config')).json();
  assert.equal(config.mode, 'demo');
  assert.ok(config.store.policies.returns);
});

test('private files are never served', async () => {
  for (const p of ['/.env', '/.env.example', '/package.json', '/server.mjs', '/data/products.json', '/data/store.json', '/lib/store.mjs', '/api/index.mjs', '/public/index.html', '/vercel.json', '/test/store.test.mjs', '/README.md', '/%2e%2e/server.mjs', '/src/%2e%2e/server.mjs', '/assets/%2e%2e/.env', '/assets/../server.mjs']) {
    const res = await fetch(demo.base + p);
    assert.ok([403, 404].includes(res.status), `${p} returned ${res.status}`);
  }
});

test('demo checkout takes no payment', async () => {
  const res = await post(demo.base + '/api/checkout', { items: [{ id: 'fortivor-pre-workout', qty: 1 }] });
  assert.deepEqual(await res.json(), { mode: 'demo', url: '/order/success?demo=1' });
});

test('checkout rejects bad carts', async () => {
  for (const items of [[], [{ id: 'nope', qty: 1 }], [{ id: 'fortivor-pre-workout', qty: 0 }], [{ id: 'fortivor-pre-workout', qty: 21 }], [{ id: 'fortivor-pre-workout', qty: 15 }, { id: 'fortivor-pre-workout', qty: 15 }]]) {
    assert.equal((await post(demo.base + '/api/checkout', { items })).status, 400, JSON.stringify(items));
  }
  assert.equal((await post(demo.base + '/api/checkout', 'not json')).status, 400);
  assert.equal((await fetch(demo.base + '/api/checkout', { method: 'POST', body: '{}' })).status, 415);
});

test('Stripe checkout uses server prices, then webhook notifies once per order', async () => {
  const res = await post(testMode.base + '/api/checkout', { items: [{ id: 'fortivor-pre-workout', qty: 2, priceCents: 1 }] }, { 'X-Forwarded-For': '10.0.0.1' });
  const data = await res.json();
  assert.equal(res.status, 200, JSON.stringify(data));
  assert.match(data.url, /^https:\/\/checkout\.stripe\.com\//);
  const call = stripeCalls.findLast(c => c.method === 'POST');
  assert.equal(call.auth, 'Bearer sk_test_123');
  assert.equal(call.body.get('line_items[0][price_data][unit_amount]'), '4999');
  assert.equal(call.body.get('line_items[0][quantity]'), '2');
  assert.equal(call.body.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '1000');
  assert.equal(call.body.get('shipping_address_collection[allowed_countries][0]'), 'US');

  const sessionId = data.url.split('/').pop();
  const verify = await (await fetch(`${testMode.base}/api/checkout/verify?session_id=${sessionId}`)).json();
  assert.equal(verify.paymentStatus, 'paid');
  assert.equal(verify.email, 'buyer@example.com');

  const event = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: sessionId } } };
  assert.equal((await signedWebhook(testMode.base, event, 'whsec_wrong')).status, 400);
  assert.equal((await signedWebhook(testMode.base, event)).status, 200);
  assert.equal((await signedWebhook(testMode.base, event)).status, 200); // Stripe retries must not duplicate

  assert.equal(intents.get('pi_' + sessionId).metadata.notified, 'true');
  assert.equal(notifications.length, 1);
  assert.match(notifications[0].text, /2× Fortivor Pre-Workout/);
});

test('admin can list and fulfil orders with the token only', async () => {
  assert.equal((await fetch(testMode.base + '/api/admin/orders')).status, 401);
  assert.equal((await fetch(testMode.base + '/api/admin/orders', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  assert.equal((await fetch(demo.base + '/api/admin/orders', { headers: { Authorization: 'Bearer anything' } })).status, 404);
  const auth = { Authorization: `Bearer ${ADMIN_TOKEN}` };
  const { orders } = await (await fetch(testMode.base + '/api/admin/orders', { headers: auth })).json();
  assert.equal(orders.length, 1);
  assert.equal(orders[0].payment, 'paid');
  assert.equal(orders[0].fulfillment, 'unfulfilled');
  assert.equal(orders[0].items[0].qty, 2);
  assert.equal(orders[0].shipping.address.city, 'Austin');
  const res = await post(`${testMode.base}/api/admin/orders/${orders[0].id}`, { fulfillment: 'fulfilled', tracking: '1Z999' }, auth);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).order.tracking, '1Z999');
  assert.equal(intents.get(orders[0].paymentIntent).metadata.fulfillment, 'fulfilled');
  const again = await (await fetch(testMode.base + '/api/admin/orders', { headers: auth })).json();
  assert.equal(again.orders[0].fulfillment, 'fulfilled');
  assert.equal((await post(`${testMode.base}/api/admin/orders/${orders[0].id}`, { fulfillment: 'fulfilled' })).status, 401);
});

test('rate limit is per customer behind a proxy', async () => {
  const attempt = ip => post(testMode.base + '/api/checkout', { items: [{ id: 'nope', qty: 1 }] }, { 'X-Forwarded-For': ip });
  for (let i = 0; i < 12; i++) await attempt('10.9.9.9');
  assert.equal((await attempt('10.9.9.9')).status, 429);
  assert.equal((await attempt('10.8.8.8')).status, 400);
});

test('live mode hides sample listings and refuses checkout until fully configured', async () => {
  const live = await startStore({ STRIPE_SECRET_KEY: 'sk_live_123', STORE_LIVE: 'true', PUBLIC_BASE_URL: 'https://shop.example.com' });
  try {
    const { products } = await (await fetch(live.base + '/api/products')).json();
    assert.ok(products.length >= 1 && products.every(p => !p.isSample));
    const config = await (await fetch(live.base + '/api/config')).json();
    assert.equal(config.preview, true);
    assert.equal((await post(live.base + '/api/checkout', { items: [{ id: 'fortivor-pre-workout', qty: 1 }] })).status, 409);
    assert.equal((await post(live.base + '/api/checkout', { items: [{ id: 'sample-creatine', qty: 1 }] })).status, 400);
    assert.match(live.output(), /SHIP_US_CENTS/);
    assert.match(live.output(), /SUPPORT_EMAIL/);
  } finally { live.stop(); }

  const ready = await startStore({ STRIPE_SECRET_KEY: 'sk_live_123', STORE_LIVE: 'true', PUBLIC_BASE_URL: 'https://shop.example.com', SHIP_US_CENTS: '0', STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET, SUPPORT_EMAIL: 'help@example.com' });
  try {
    const config = await (await fetch(ready.base + '/api/config')).json();
    assert.equal(config.preview, true); // supplied catalog still lacks approved price, label and stock
    const res = await post(ready.base + '/api/checkout', { items: [{ id: 'fortivor-pre-workout', qty: 1 }] });
    assert.equal(res.status, 409);
    const health = await (await fetch(ready.base + '/healthz')).json();
    assert.equal(health.ready,false);
    assert.ok(health.missing.some(p=>p.includes('priceConfirmed')));
    assert.ok(health.missing.some(p=>p.includes('inventoryQuantity')));
    assert.ok(health.missing.some(p=>p.includes('Supplement Facts')));
    assert.equal((await fetch(ready.base + '/')).headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
  } finally { ready.stop(); }
});


test('inventory is unconfirmed in the supplied catalog and samples cannot reach Stripe even in test mode', async () => {
 const {products}=await (await fetch(demo.base+'/api/products')).json();
 assert.equal(products[0].inStock,false);
 assert.equal(products[0].demoAvailable,true);
 assert.equal(products[0].priceConfirmed,false);
 const response=await post(testMode.base+'/api/checkout',{items:[{id:'sample-creatine',qty:1}]},{'X-Forwarded-For':'10.3.3.1'});
 assert.equal(response.status,400);
 assert.match((await response.json()).error,/Sample listings/);
});

test('concurrent signed webhook deliveries are coalesced and paid verification persists on Stripe', async () => {
 const response=await post(testMode.base+'/api/checkout',{items:[{id:'fortivor-pre-workout',qty:1}]},{'X-Forwarded-For':'10.3.3.2'});
 const {url}=await response.json(); const id=url.split('/').pop();
 const event={id:'evt_concurrent',type:'checkout.session.completed',data:{object:{id}}};
 const before=notifications.length;
 const results=await Promise.all(Array.from({length:5},()=>signedWebhook(testMode.base,event)));
 assert.ok(results.every(r=>r.status===200));
 assert.equal(notifications.length,before+1);
 assert.equal(intents.get('pi_'+id).metadata.payment_verified,'true');
 assert.equal(notifications.at(-1).idempotencyKey,'auctoran-order-'+id);
});

test('fulfillment requires a signed webhook and checkout verification rejects a foreign store',async()=>{
 const response=await post(testMode.base+'/api/checkout',{items:[{id:'fortivor-pre-workout',qty:1}]},{'X-Forwarded-For':'10.3.3.3'});
 const {url}=await response.json();const id=url.split('/').pop();
 const fulfillment=await post(testMode.base+'/api/admin/orders/'+id,{fulfillment:'fulfilled'},{Authorization:'Bearer '+ADMIN_TOKEN});
 assert.equal(fulfillment.status,502);
 assert.match((await fulfillment.json()).error,/signed webhook/);
 const session=sessions.get(id);session.metadata.store='another-store';
 assert.equal((await fetch(testMode.base+'/api/checkout/verify?session_id='+id)).status,404);
});
