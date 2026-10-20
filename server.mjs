import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !Object.hasOwn(process.env, match[1])) process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}

const env = process.env;
const PORT = Number(env.PORT || 3000);
// RENDER_EXTERNAL_URL is set automatically on Render; other hosts need PUBLIC_BASE_URL.
const BASE = (env.PUBLIC_BASE_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const STRIPE_KEY = env.STRIPE_SECRET_KEY || '';
const STRIPE_API = env.STRIPE_API_BASE || 'https://api.stripe.com';
const STRIPE_VERSION = '2024-06-20';
const STORE_LIVE = env.STORE_LIVE === 'true';
const TRUST_PROXY = env.TRUST_PROXY === 'true';
const ADMIN_TOKEN = env.ADMIN_TOKEN || '';
const SUPPORT_EMAIL = env.SUPPORT_EMAIL || '';
const NOTIFY_URL = env.ORDER_NOTIFY_URL || '';
const DATA_DIR = path.resolve(ROOT, env.DATA_DIR || 'storage');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SHIPPING_CENTS = env.SHIP_US_CENTS !== undefined && env.SHIP_US_CENTS !== '' ? Number(env.SHIP_US_CENTS) : null;
const FREE_SHIP_OVER_CENTS = env.FREE_SHIP_OVER_CENTS ? Number(env.FREE_SHIP_OVER_CENTS) : null;
const MODE = !STRIPE_KEY ? 'demo' : STRIPE_KEY.startsWith('sk_test_') ? 'stripe-test' : 'stripe-live';

const STORE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/store.json'), 'utf8'));
// Sample listings are hidden entirely once the store is live, so they can never be sold.
const PRODUCTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'))
  .filter(p => p.active !== false && !(STORE_LIVE && p.isSample))
  .map(p => ({ ...p, inStock: p.inStock !== false }));
const byId = new Map(PRODUCTS.map(p => [p.id, p]));
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
// Only these paths are public. Everything else (data/, storage/, server code, .env) is never served.
const PUBLIC_FILES = new Set(['/index.html', '/styles.css', '/enhancements.css', '/robots.txt']);
const PUBLIC_DIRS = ['/assets/', '/src/'];
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

function liveProblems() {
  const problems = [];
  if (!STORE_LIVE) return problems;
  if (!STRIPE_KEY.startsWith('sk_live_')) problems.push('STRIPE_SECRET_KEY must be a sk_live_ key');
  if (SHIPPING_CENTS === null || !Number.isInteger(SHIPPING_CENTS) || SHIPPING_CENTS < 0) problems.push('SHIP_US_CENTS must be set (0 for free shipping)');
  if (!env.STRIPE_WEBHOOK_SECRET) problems.push('STRIPE_WEBHOOK_SECRET must be set so paid orders are recorded');
  if (!SUPPORT_EMAIL) problems.push('SUPPORT_EMAIL must be set');
  if (!BASE.startsWith('https://')) problems.push('PUBLIC_BASE_URL must be your https:// domain');
  if (!PRODUCTS.length) problems.push('data/products.json has no active products');
  return problems;
}
const LIVE_PROBLEMS = liveProblems();

function reply(res, status, payload, extraHeaders={}) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extraHeaders});
  res.end(JSON.stringify(payload));
}
async function bodyBytes(req,max=24_000){
  const chunks=[];let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>max)throw new Error('Request body too large');chunks.push(chunk)}
  return Buffer.concat(chunks);
}
async function jsonBody(req){
  if(!req.headers['content-type']?.includes('application/json'))throw Object.assign(new Error('Expected JSON body'),{status:415});
  return JSON.parse((await bodyBytes(req)).toString('utf8')||'{}');
}
function clientIp(req){
  // Behind Render/Railway/Fly, every request arrives from the proxy; the proxy appends the real client last.
  const forwarded=TRUST_PROXY&&String(req.headers['x-forwarded-for']||'').split(',').map(s=>s.trim()).filter(Boolean).pop();
  return forwarded||req.socket.remoteAddress||'unknown';
}
const limits = new Map();
function throttle(key,max=12,windowMs=600_000){
  const now=Date.now();const recent=(limits.get(key)||[]).filter(t=>now-t<windowMs);
  if(recent.length>=max){limits.set(key,recent);return false;}
  recent.push(now);limits.set(key,recent);return true;
}
setInterval(()=>{const now=Date.now();for(const [key,times] of limits)if(!times.some(t=>now-t<600_000))limits.delete(key);},600_000).unref();

function safeEqual(a,b){
  const x=crypto.createHash('sha256').update(String(a)).digest();const y=crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x,y);
}
function stripeSignatureValid(raw, signature, secret) {
  if (!secret || !signature) return false;
  const pairs=signature.split(',').map(p=>p.trim().split('='));
  const timestamp=Number(pairs.find(([k])=>k==='t')?.[1]);
  if(!Number.isFinite(timestamp)||Math.abs(Date.now()/1000-timestamp)>300)return false;
  const computed=crypto.createHmac('sha256',secret).update(`${timestamp}.${raw.toString('utf8')}`).digest('hex');
  // Stripe may send several v1 signatures while a webhook secret is being rolled.
  return pairs.some(([k,v])=>k==='v1'&&/^[0-9a-f]{64}$/.test(v||'')&&crypto.timingSafeEqual(Buffer.from(computed,'hex'),Buffer.from(v,'hex')));
}
async function stripe(method,pathname,form){
  const headers={Authorization:`Bearer ${STRIPE_KEY}`,'Stripe-Version':STRIPE_VERSION};
  if(form){headers['Content-Type']='application/x-www-form-urlencoded';headers['Idempotency-Key']=crypto.randomUUID();}
  const response=await fetch(STRIPE_API+pathname,{method,headers,body:form?.toString(),signal:AbortSignal.timeout(16000)});
  const json=await response.json();
  if(!response.ok)throw new Error(json.error?.message||`Stripe request failed (${response.status})`);
  return json;
}
function shippingFor(subtotal){
  if(SHIPPING_CENTS===null)return null;
  return FREE_SHIP_OVER_CENTS!==null&&subtotal>=FREE_SHIP_OVER_CENTS?0:SHIPPING_CENTS;
}
async function createStripeSession(cart){
  const data=new URLSearchParams();
  const subtotal=cart.reduce((sum,item)=>sum+byId.get(item.id).priceCents*item.qty,0);
  data.set('mode','payment');
  data.set('success_url',`${BASE}/order/success?session_id={CHECKOUT_SESSION_ID}`);
  data.set('cancel_url',`${BASE}/cart?cancelled=1`);
  data.set('billing_address_collection','required');
  data.set('shipping_address_collection[allowed_countries][0]','US');
  data.set('phone_number_collection[enabled]','true');
  data.set('metadata[store]','auctoran-labs');
  data.set('metadata[items]',cart.map(i=>`${i.id}:${i.qty}`).join(','));
  data.set('payment_intent_data[metadata][store]','auctoran-labs');
  if(env.STRIPE_AUTOMATIC_TAX==='true')data.set('automatic_tax[enabled]','true');
  const shipping=shippingFor(subtotal);
  if(shipping!==null){
    data.set('shipping_options[0][shipping_rate_data][type]','fixed_amount');
    data.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]',String(shipping));
    data.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]','usd');
    data.set('shipping_options[0][shipping_rate_data][display_name]',shipping===0?'Complimentary US shipping':'Standard US shipping');
    if(env.STRIPE_AUTOMATIC_TAX==='true')data.set('shipping_options[0][shipping_rate_data][tax_behavior]','exclusive');
  }
  cart.forEach((item,i)=>{
    const product=byId.get(item.id);
    data.set(`line_items[${i}][quantity]`,String(item.qty));
    data.set(`line_items[${i}][price_data][currency]`,'usd');
    data.set(`line_items[${i}][price_data][unit_amount]`,String(product.priceCents));
    data.set(`line_items[${i}][price_data][product_data][name]`,product.fullName);
    data.set(`line_items[${i}][price_data][product_data][description]`,`${product.brand} · ${product.size}`.slice(0,300));
    data.set(`line_items[${i}][price_data][product_data][metadata][product_id]`,product.id);
    if(env.STRIPE_AUTOMATIC_TAX==='true')data.set(`line_items[${i}][price_data][tax_behavior]`,'exclusive');
  });
  const session=await stripe('POST','/v1/checkout/sessions',data);
  if(!session.url)throw new Error('Stripe Checkout could not be created');
  return session;
}

// Orders are a small JSON file: enough for a single-instance store. Stripe stays the source of truth for payments.
let orderQueue=Promise.resolve();
function readOrders(){try{return JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8'));}catch{return [];}}
function updateOrders(change){
  const run=orderQueue.then(()=>{
    const orders=readOrders();const result=change(orders);
    fs.mkdirSync(DATA_DIR,{recursive:true});
    const temp=`${ORDERS_FILE}.${process.pid}.tmp`;fs.writeFileSync(temp,JSON.stringify(orders,null,2));fs.renameSync(temp,ORDERS_FILE);
    return result;
  });
  orderQueue=run.catch(()=>{});
  return run;
}
function orderFromSession(s){
  const items=String(s.metadata?.items||'').split(',').filter(Boolean).map(entry=>{
    const [id,qty]=entry.split(':');const product=byId.get(id);
    return {id,name:product?.fullName||id,qty:Number(qty),unitCents:product?.priceCents??null};
  });
  const ship=s.shipping_details||s.collected_information?.shipping_details||null;
  return {
    id:s.id,createdAt:new Date((s.created||Date.now()/1000)*1000).toISOString(),
    payment:s.payment_status==='paid'?'paid':s.payment_status==='no_payment_required'?'paid':'awaiting_payment',
    fulfillment:'unfulfilled',tracking:'',livemode:Boolean(s.livemode),
    email:s.customer_details?.email||'',name:s.customer_details?.name||'',phone:s.customer_details?.phone||'',
    shipping:ship?{name:ship.name||'',address:ship.address||{}}:null,
    items,subtotalCents:s.amount_subtotal,shippingCents:s.total_details?.amount_shipping??0,taxCents:s.total_details?.amount_tax??0,
    totalCents:s.amount_total,currency:s.currency,paymentIntent:typeof s.payment_intent==='string'?s.payment_intent:s.payment_intent?.id||''
  };
}
async function notifyOrder(order){
  if(!NOTIFY_URL)return;
  const money=c=>`$${(c/100).toFixed(2)}`;
  const text=`New Auctoran order ${order.id}: ${order.items.map(i=>`${i.qty}× ${i.name}`).join(', ')} — ${money(order.totalCents)} — ${order.name} <${order.email}>`;
  try{await fetch(NOTIFY_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,order}),signal:AbortSignal.timeout(8000)});}
  catch(err){console.error('Order notification failed:',err.message);}
}
async function recordCheckout(eventType,sessionId){
  const session=await stripe('GET','/v1/checkout/sessions/'+encodeURIComponent(sessionId));
  if(session.metadata?.store!=='auctoran-labs')return;
  const incoming=orderFromSession(session);
  if(eventType==='checkout.session.async_payment_failed')incoming.payment='failed';
  const created=await updateOrders(orders=>{
    const existing=orders.find(o=>o.id===incoming.id);
    if(existing){const wasPaid=existing.payment==='paid';existing.payment=incoming.payment;return !wasPaid&&incoming.payment==='paid'?existing:null;}
    orders.unshift(incoming);return incoming.payment==='paid'?incoming:null;
  });
  console.log('Order recorded:',incoming.id,'payment:',incoming.payment);
  if(created)await notifyOrder(created);
}
function adminAuthorized(req){
  if(!ADMIN_TOKEN)return false;
  const header=String(req.headers.authorization||'');
  return header.startsWith('Bearer ')&&safeEqual(header.slice(7),ADMIN_TOKEN);
}
function publicConfig(){
  return {
    mode:MODE,storeLive:STORE_LIVE,preview:!STORE_LIVE||LIVE_PROBLEMS.length>0,shippingConfigured:SHIPPING_CENTS!==null,
    shippingCents:SHIPPING_CENTS,freeShippingOverCents:FREE_SHIP_OVER_CENTS,supportEmail:SUPPORT_EMAIL,store:STORE
  };
}

const server=http.createServer(async (req,res)=>{
  let url;try{url=new URL(req.url,'http://internal');}catch{res.writeHead(400);return res.end('Bad request');}
  const pathname=url.pathname;
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(BASE.startsWith('https://'))res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  try{
  if(pathname==='/healthz')return reply(res,200,{ok:true,mode:MODE,storeLive:STORE_LIVE,ready:!LIVE_PROBLEMS.length});
  if(pathname==='/api/config'&&req.method==='GET')return reply(res,200,publicConfig());
  if(pathname==='/api/products'&&req.method==='GET')return reply(res,200,{products:PRODUCTS});
  if(pathname==='/api/checkout'&&req.method==='POST'){
    if(!throttle('checkout:'+clientIp(req)))return reply(res,429,{error:'Too many checkout attempts. Please try again in a few minutes.'});
    try{
      const {items}=await jsonBody(req);
      if(!Array.isArray(items)||!items.length||items.length>30)throw new Error('Your bag is empty or invalid.');
      const quantities=new Map();
      for(const item of items){
        if(typeof item?.id!=='string'||!byId.has(item.id)||!Number.isInteger(item.qty)||item.qty<1||item.qty>20)throw new Error('An item in your bag is no longer available. Please refresh and try again.');
        quantities.set(item.id,(quantities.get(item.id)||0)+item.qty);
      }
      const cart=[...quantities].map(([id,qty])=>({id,qty}));
      if(cart.some(i=>i.qty>20))throw new Error('Quantity limit is 20 per product.');
      const soldOut=cart.map(i=>byId.get(i.id)).filter(p=>!p.inStock);
      if(soldOut.length)throw new Error(`${soldOut.map(p=>p.name).join(', ')} is sold out. Remove it from your bag to continue.`);
      if(cart.reduce((total,item)=>total+byId.get(item.id).priceCents*item.qty,0)>9999999)throw new Error('Cart exceeds allowed total');
      if(MODE==='demo')return reply(res,200,{mode:'demo',url:'/order/success?demo=1'});
      if(!STRIPE_KEY.startsWith('sk_test_')&&!STRIPE_KEY.startsWith('sk_live_'))throw new Error('Checkout is misconfigured. Please contact support.');
      if(MODE==='stripe-live'&&(!STORE_LIVE||LIVE_PROBLEMS.length))return reply(res,409,{error:'Checkout is not open yet. Please check back soon.'});
      const session=await createStripeSession(cart);
      return reply(res,200,{mode:MODE,url:session.url});
    }catch(err){console.error('Checkout error:',err.message);return reply(res,err.status||400,{error:err.message||'Unable to begin checkout'});}
  }
  if(pathname==='/api/checkout/verify'&&req.method==='GET'){
    const id=url.searchParams.get('session_id')||'';
    if(!/^cs_(test_|live_)[A-Za-z0-9_]+$/.test(id)||!STRIPE_KEY)return reply(res,400,{error:'Invalid checkout session'});
    try{
      const s=await stripe('GET','/v1/checkout/sessions/'+encodeURIComponent(id));
      return reply(res,200,{paymentStatus:s.payment_status,status:s.status,total:s.amount_total,currency:s.currency,email:s.customer_details?.email||'',reference:s.id.slice(-8).toUpperCase()});
    }catch{return reply(res,502,{error:'Could not verify payment status. Your receipt email from Stripe is your confirmation.'});}
  }
  if(pathname==='/api/stripe/webhook'&&req.method==='POST'){
    let event;
    try{
      const raw=await bodyBytes(req,1_000_000);
      if(!stripeSignatureValid(raw,req.headers['stripe-signature'],env.STRIPE_WEBHOOK_SECRET))return reply(res,400,{error:'Invalid signature'});
      event=JSON.parse(raw.toString('utf8'));
    }catch{return reply(res,400,{error:'Invalid webhook payload'});}
    if(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'].includes(event.type)){
      // A 500 makes Stripe retry, so a temporary failure never loses an order.
      try{await recordCheckout(event.type,event.data.object.id);}
      catch(err){console.error('Webhook processing failed:',err.message);return reply(res,500,{error:'Processing failed'});}
    }
    return reply(res,200,{received:true});
  }
  if(pathname==='/api/admin/orders'&&req.method==='GET'){
    if(!throttle('admin:'+clientIp(req),120))return reply(res,429,{error:'Too many requests'});
    if(!adminAuthorized(req))return reply(res,ADMIN_TOKEN?401:404,{error:ADMIN_TOKEN?'Invalid admin token':'Admin is disabled. Set ADMIN_TOKEN.'});
    return reply(res,200,{orders:readOrders()});
  }
  const orderMatch=pathname.match(/^\/api\/admin\/orders\/(cs_(?:test|live)_[A-Za-z0-9_]+)$/);
  if(orderMatch&&req.method==='POST'){
    if(!throttle('admin:'+clientIp(req),120))return reply(res,429,{error:'Too many requests'});
    if(!adminAuthorized(req))return reply(res,ADMIN_TOKEN?401:404,{error:'Unauthorized'});
    const {fulfillment,tracking}=await jsonBody(req);
    if(!['unfulfilled','fulfilled'].includes(fulfillment))return reply(res,400,{error:'Invalid fulfillment status'});
    const order=await updateOrders(orders=>{const o=orders.find(x=>x.id===orderMatch[1]);if(o){o.fulfillment=fulfillment;o.tracking=String(tracking||'').slice(0,120);o.fulfilledAt=fulfillment==='fulfilled'?new Date().toISOString():null;}return o;});
    return order?reply(res,200,{order}):reply(res,404,{error:'Order not found'});
  }
  if(pathname.startsWith('/api/'))return reply(res,404,{error:'API route not found'});
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end('Method not allowed');}
  let requested;try{requested=decodeURIComponent(pathname);}catch{res.writeHead(400);return res.end('Malformed URL');}
  if(requested.includes('\0')||requested.split('/').some(part=>part.startsWith('.'))){res.writeHead(404);return res.end('Not found');}
  const publicPath=requested==='/'?'/index.html':requested;
  const ext=path.extname(publicPath).toLowerCase();
  const file=path.join(ROOT,publicPath);
  const allowed=(PUBLIC_FILES.has(publicPath)||PUBLIC_DIRS.some(dir=>publicPath.startsWith(dir)))&&file.startsWith(ROOT+path.sep)&&MIME[ext];
  if(allowed&&fs.existsSync(file)&&fs.statSync(file).isFile()){
    res.writeHead(200,{'Content-Type':MIME[ext],'Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600',...(ext==='.html'?{'Content-Security-Policy':CSP}:{})});
    return req.method==='HEAD'?res.end():fs.createReadStream(file).pipe(res);
  }
  if(ext){res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','Content-Security-Policy':CSP});
  return req.method==='HEAD'?res.end():fs.createReadStream(path.join(ROOT,'index.html')).pipe(res);
  }catch(err){console.error('Request error:',err.message);if(!res.headersSent)return reply(res,err.status||500,{error:err.status?err.message:'Server error'});res.end();}
});

server.listen(PORT,()=>{
  console.log(`AUCTORAN storefront: ${BASE} (port ${PORT}) | checkout: ${MODE.toUpperCase()} | store live: ${STORE_LIVE}`);
  if(MODE!=='demo'&&!env.STRIPE_WEBHOOK_SECRET)console.warn('WARNING: STRIPE_WEBHOOK_SECRET is not set; paid orders will not be recorded.');
  if(MODE!=='demo'&&BASE.startsWith('http://localhost')&&!env.PUBLIC_BASE_URL)console.warn('WARNING: PUBLIC_BASE_URL is not set; Stripe will redirect customers to localhost.');
  if(STORE_LIVE&&LIVE_PROBLEMS.length)console.warn('LIVE CHECKOUT BLOCKED until fixed:\n - '+LIVE_PROBLEMS.join('\n - '));
  if(!ADMIN_TOKEN)console.warn('NOTE: ADMIN_TOKEN is not set; the /admin order page is disabled.');
});
const shutdown=()=>server.close(()=>process.exit(0));
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
export { server };
