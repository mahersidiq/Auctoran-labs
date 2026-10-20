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

const PORT = Number(process.env.PORT || 3000);
const BASE = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const STORE_LIVE = process.env.STORE_LIVE === 'true';
const SHIPPING_CENTS = process.env.SHIP_US_CENTS !== undefined && process.env.SHIP_US_CENTS !== '' ? Number(process.env.SHIP_US_CENTS) : null;
const PRODUCTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
const byId = new Map(PRODUCTS.map(p => [p.id, p]));
const limits = new Map();
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};

function reply(res, status, payload, extraHeaders={}) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extraHeaders});
  res.end(JSON.stringify(payload));
}
async function bodyBytes(req,max=24_000){
  const chunks=[];let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>max)throw new Error('Request body too large');chunks.push(chunk)}
  return Buffer.concat(chunks);
}
function throttle(ip){
  const now=Date.now();const old=limits.get(ip)||[];const recent=old.filter(t=>now-t<600_000);
  if(recent.length>=12){limits.set(ip,recent);return false;}
  recent.push(now);limits.set(ip,recent);return true;
}
function stripeSignatureValid(raw, signature, secret) {
  if (!secret || !signature) return false;
  const parts=Object.fromEntries(signature.split(',').map(p=>p.trim().split('=',2)));
  const timestamp=Number(parts.t);
  if(!Number.isFinite(timestamp)||Math.abs(Date.now()/1000-timestamp)>300||!parts.v1)return false;
  const computed=crypto.createHmac('sha256',secret).update(`${parts.t}.${raw.toString('utf8')}`).digest('hex');
  const a=Buffer.from(computed,'hex');const b=Buffer.from(parts.v1,'hex');
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
async function createStripeSession(cart){
  const data=new URLSearchParams();
  data.set('mode','payment');
  data.set('success_url',`${BASE}/order/success?session_id={CHECKOUT_SESSION_ID}`);
  data.set('cancel_url',`${BASE}/cart?cancelled=1`);
  data.set('billing_address_collection','required');
  data.set('shipping_address_collection[allowed_countries][0]','US');
  data.set('payment_method_types[0]','card');
  data.set('phone_number_collection[enabled]','true');
  data.set('metadata[store]','auctoran-labs');
  data.set('metadata[items]',cart.map(i=>`${i.id}:${i.qty}`).join(','));
  if(process.env.STRIPE_AUTOMATIC_TAX==='true')data.set('automatic_tax[enabled]','true');
  if(SHIPPING_CENTS!==null){
    data.set('shipping_options[0][shipping_rate_data][type]','fixed_amount');
    data.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]',String(SHIPPING_CENTS));
    data.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]','usd');
    data.set('shipping_options[0][shipping_rate_data][display_name]',SHIPPING_CENTS===0?'Complimentary US shipping':'Standard US shipping');
  }
  cart.forEach((item,i)=>{
    const product=byId.get(item.id);
    data.set(`line_items[${i}][quantity]`,String(item.qty));
    data.set(`line_items[${i}][price_data][currency]`,'usd');
    data.set(`line_items[${i}][price_data][unit_amount]`,String(product.priceCents));
    data.set(`line_items[${i}][price_data][product_data][name]`,product.fullName);
    data.set(`line_items[${i}][price_data][product_data][description]`,`${product.brand} · ${product.size}`.slice(0,300));
  });
  const stripe=await fetch('https://api.stripe.com/v1/checkout/sessions',{
    method:'POST',headers:{Authorization:`Bearer ${STRIPE_KEY}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':crypto.randomUUID()},body:data.toString(),signal:AbortSignal.timeout(16000)
  });
  const json=await stripe.json();
  if(!stripe.ok || !json.url)throw new Error(json.error?.message||'Stripe Checkout could not be created');
  return json;
}
const server=http.createServer(async (req,res)=>{
  const url=new URL(req.url,BASE);
  const pathname=url.pathname;
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if(pathname==='/api/config'&&req.method==='GET'){
    return reply(res,200,{mode:!STRIPE_KEY?'demo':STRIPE_KEY.startsWith('sk_test_')?'stripe-test':'stripe-live',storeLive:STORE_LIVE,preview:!STORE_LIVE||PRODUCTS.some(p=>p.isSample),shippingConfigured:SHIPPING_CENTS!==null});
  }
  if(pathname==='/api/products'&&req.method==='GET')return reply(res,200,{products:PRODUCTS});
  if(pathname==='/api/checkout'&&req.method==='POST'){
    if(!throttle(req.socket.remoteAddress||'unknown'))return reply(res,429,{error:'Too many checkout attempts. Please try later.'});
    try{
      if(!req.headers['content-type']?.includes('application/json'))return reply(res,415,{error:'Expected JSON body'});
      const {items}=JSON.parse((await bodyBytes(req)).toString('utf8'));
      if(!Array.isArray(items)||!items.length||items.length>30)throw new Error('Invalid cart');
      const quantities=new Map();
      for(const item of items){
        if(typeof item.id!=='string'||!byId.has(item.id)||!Number.isInteger(item.qty)||item.qty<1||item.qty>20)throw new Error('Invalid cart item or quantity');
        quantities.set(item.id,(quantities.get(item.id)||0)+item.qty);
      }
      const cart=[...quantities].map(([id,qty])=>({id,qty}));
      if(cart.some(i=>i.qty>20))throw new Error('Quantity limit exceeded');
      if(cart.reduce((total,item)=>total+byId.get(item.id).priceCents*item.qty,0)>9999999)throw new Error('Cart exceeds allowed total');
      if(!STRIPE_KEY)return reply(res,200,{mode:'demo',url:'/order/success?demo=1'});
      if(!STRIPE_KEY.startsWith('sk_test_')&&!STRIPE_KEY.startsWith('sk_live_'))throw new Error('Invalid Stripe configuration');
      if(STRIPE_KEY.startsWith('sk_live_')){
        if(!STORE_LIVE)return reply(res,409,{error:'Live payments are disabled until STORE_LIVE=true and all launch details are verified.'});
        if(SHIPPING_CENTS===null) return reply(res,409,{error:'Configure SHIP_US_CENTS before accepting live payments.'});
        if(PRODUCTS.some(p=>p.isSample))return reply(res,409,{error:'Remove or replace all sample partner listings before enabling live payments.'});
      }
      const session=await createStripeSession(cart);
      return reply(res,200,{mode:STRIPE_KEY.startsWith('sk_test_')?'stripe-test':'stripe-live',url:session.url});
    }catch(err){console.error('Checkout error:',err.message);return reply(res,400,{error:err.message||'Unable to begin checkout'});}
  }
  if(pathname==='/api/checkout/verify'&&req.method==='GET'){
    const id=url.searchParams.get('session_id')||'';
    if(!/^cs_(test_|live_)[A-Za-z0-9_]+$/.test(id)||!STRIPE_KEY)return reply(res,400,{error:'Invalid checkout session'});
    try{
      const stripe=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(id),{headers:{Authorization:`Bearer ${STRIPE_KEY}`},signal:AbortSignal.timeout(12000)});
      const json=await stripe.json();if(!stripe.ok)throw new Error('Session not found');
      return reply(res,200,{paymentStatus:json.payment_status,status:json.status,total:json.amount_total,currency:json.currency});
    }catch(err){return reply(res,502,{error:'Could not verify payment status'});}
  }
  if(pathname==='/api/stripe/webhook'&&req.method==='POST'){
    try{
      const raw=await bodyBytes(req,1_000_000);
      if(!stripeSignatureValid(raw,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET))return reply(res,400,{error:'Invalid signature'});
      const event=JSON.parse(raw.toString('utf8'));
      if(event.type==='checkout.session.completed'){
        // Stripe owns payment/order records in this starter; connect your order-management/fulfillment system here.
        console.log('Verified Stripe checkout:',event.data.object.id,'payment:',event.data.object.payment_status);
      }
      return reply(res,200,{received:true});
    }catch{return reply(res,400,{error:'Invalid webhook payload'});}
  }
  if(pathname.startsWith('/api/'))return reply(res,404,{error:'API route not found'});
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end('Method not allowed');}
  let requested;try{requested=decodeURIComponent(pathname);}catch{res.writeHead(400);return res.end('Malformed URL');}
  if(requested.split('/').some(part=>part.startsWith('.')||part==='..')){res.writeHead(403);return res.end('Forbidden');}
  const file=path.join(ROOT,requested==='/'?'index.html':requested);
  const ext=path.extname(file).toLowerCase();
  const staticAllowed=file.startsWith(ROOT+path.sep)&&['.html','.css','.js','.json','.jpg','.jpeg','.png','.webp','.svg','.ico'].includes(ext);
  if(staticAllowed&&fs.existsSync(file)&&fs.statSync(file).isFile()){
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600'});
    return req.method==='HEAD'?res.end():fs.createReadStream(file).pipe(res);
  }
  if(ext){res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});
  return req.method==='HEAD'?res.end():fs.createReadStream(path.join(ROOT,'index.html')).pipe(res);
});
server.listen(PORT,()=>console.log(`AUCTORAN storefront: http://localhost:${PORT} | checkout: ${!STRIPE_KEY?'DEMO':STRIPE_KEY.startsWith('sk_test_')?'STRIPE TEST':'STRIPE LIVE'} | store live: ${STORE_LIVE}`));
