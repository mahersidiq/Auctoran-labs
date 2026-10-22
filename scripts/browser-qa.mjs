// Optional QA: PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs node scripts/browser-qa.mjs
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const modulePath=process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
const {chromium}=await import(pathToFileURL(modulePath));
const base=process.env.QA_BASE_URL||'http://localhost:3000';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],errors=[];
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const check=async(name,fn)=>{await fn();results.push({name,status:'passed'});console.log('PASS '+name);};
const go=async path=>{await page.goto(base+path);await page.locator('main').waitFor();};
const readyImages=async()=>page.evaluate(async()=>{await Promise.all([...document.images].map(async img=>{img.loading='eager';try{await img.decode();}catch{}}));});
const closeBag=async()=>{if(await page.locator('.cart-drawer.active').count())await page.getByRole('button',{name:'Close shopping bag',exact:true}).click();};
try{
 await check('A: homepage → Fortivor → add → demo checkout; no payment and bag retained',async()=>{
  await go('/');await page.locator('.campaign-actions a').first().click();await page.locator('.add-detail').click();
  await page.locator('.cart-drawer a[href="/cart"]').click();await page.getByRole('button',{name:'TRY DEMO CHECKOUT'}).click();
  await page.locator('.order-page').waitFor();assert.match(await page.locator('.order-page').innerText(),/No payment was collected/);
  assert.equal(new URL(page.url()).search,'?demo=1');assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('auctoran-cart-v1')))[0].qty,1);
 });
 await check('B: Protein shortcut → price/brand filter → sample detail → demo cart',async()=>{
  await go('/');await page.locator('.discovery-rail a[href="/shop?category=protein"]').click();await page.selectOption('#price-choice','7500');
  await page.selectOption('#brand-choice','partner');assert.equal(await page.locator('.shop-grid .product-card').count(),1);
  await page.locator('.product-name').click();assert.match(await page.locator('.stock-status').innerText(),/Sample listing/);
  await page.locator('.add-detail').click();assert.match(await page.locator('.cart-drawer.active').innerText(),/Whey Isolate/);await closeBag();
 });
 await check('C: stack goal → preferences → explicit concept opt-in → quantities → bulk add',async()=>{
  await go('/build-your-stack');await page.getByRole('button',{name:/03 Training Performance/}).click();
  await page.getByRole('button',{name:'CONTINUE',exact:true}).click();await page.locator('#stack-preview').check();await page.selectOption('#stack-budget','10000');
  await page.getByRole('button',{name:'SEE MY SELECTION'}).click();assert.equal(await page.locator('.stack-result').count(),1);
  assert.match(await page.locator('.stack-result').innerText(),/300 mg caffeine/);
  await page.getByRole('button',{name:'Increase Fortivor stack quantity',exact:true}).click();assert.match(await page.locator('.stack-checkout').innerText(),/\$99.98/);
  await page.getByRole('button',{name:'ADD SELECTED TO DEMO BAG'}).click();assert.match(await page.locator('.cart-drawer.active').innerText(),/Fortivor/);await closeBag();
 });
 await check('Stack default and stimulant-free routes truthfully return no verified stock',async()=>{
  await go('/build-your-stack');await page.getByRole('button',{name:/03 Training Performance/}).click();await page.getByRole('button',{name:'CONTINUE',exact:true}).click();
  await page.getByRole('button',{name:'SEE MY SELECTION'}).click();assert.equal(await page.locator('.stack-empty').count(),1);
  await page.getByRole('button',{name:'← EDIT PREFERENCES'}).click();await page.locator('#stack-preview').check();await page.locator('input[name="stack-stimulant"][value="free"]').check();
  await page.getByRole('button',{name:'SEE MY SELECTION'}).click();assert.equal(await page.locator('.stack-result').count(),0);
 });
 await check('D: 390px menu → product → quantity → add → checkout',async()=>{
  await page.setViewportSize({width:390,height:844});await go('/');await page.getByRole('button',{name:'Open menu',exact:true}).click();
  await page.locator('.mobile-nav-panel a[href="/shop?category=pre-workout"]').click();await page.locator('.product-name').click();
  await page.getByRole('button',{name:'Increase quantity',exact:true}).click();assert.equal(await page.locator('.purchase-controls output').innerText(),'2');
  await page.locator('.add-detail').click();await page.locator('.cart-drawer a[href="/cart"]').click();await page.getByRole('button',{name:'TRY DEMO CHECKOUT'}).click();await page.locator('.order-page').waitFor();assert.match(await page.locator('h1').innerText(),/DEMO/);
 });
 await check('E: returning customer restores cart, accurate subtotal, quantity updates, removal',async()=>{
  await go('/cart');await page.reload();await page.locator('.cart-list').waitFor();
  const items=JSON.parse(await page.evaluate(()=>localStorage.getItem('auctoran-cart-v1')));
  const catalog=(await (await page.request.get(base+'/api/products')).json()).products;
  const expected=items.reduce((n,i)=>n+catalog.find(p=>p.id===i.id).priceCents*i.qty,0);
  assert.equal(await page.locator('.summary-total strong').innerText(),'$'+(expected/100).toFixed(2));
  const before=items[0].qty;await page.locator('.cart-list [data-action="increase"]').first().click();
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('auctoran-cart-v1')))[0].qty,Math.min(20,before+1));
  await page.locator('.cart-list [data-action="remove"]').first().click();assert.equal(await page.locator('.cart-list .cart-line').count(),items.length-1);
 });
 await check('Checkout server failure is visible, retry enabled, cart preserved',async()=>{
  await go('/cart');await page.route('**/api/checkout',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Checkout is temporarily unavailable. Please try again.'})}));
  await page.getByRole('button',{name:'TRY DEMO CHECKOUT'}).click();await page.locator('#checkout-error').filter({hasText:'temporarily unavailable'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'TRY DEMO CHECKOUT'}).isEnabled(),true);assert.ok(JSON.parse(await page.evaluate(()=>localStorage.getItem('auctoran-cart-v1'))).length>0);await page.unroute('**/api/checkout');
 });
 await check('Gallery thumbnails, zoom, Escape, swipe and mobile sticky purchase visibility',async()=>{
  await go('/product/fortivor-pre-workout');assert.equal(await page.locator('.detail-image-row button').count(),3);
  assert.equal(await page.locator('.detail-image-row').getByText('Nutrition facts').count(),0);
  await page.getByRole('button',{name:'View Label detail',exact:true}).click();assert.match(await page.locator('.gallery-caption').innerText(),/Close-up/);
  await page.locator('.detail-gallery-image').click();assert.equal(await page.locator('#gallery-zoom').evaluate(d=>d.open),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#gallery-zoom').evaluate(d=>d.open),false);
  await page.locator('.detail-gallery-image').dispatchEvent('touchstart',{changedTouches:[{identifier:1,clientX:300,clientY:200}]});await page.locator('.detail-gallery-image').dispatchEvent('touchend',{changedTouches:[{identifier:1,clientX:100,clientY:205}]});
  assert.equal(await page.getByRole('button',{name:'View The work',exact:true}).getAttribute('aria-pressed'),'true');
  await page.locator('#primary-purchase').scrollIntoViewIfNeeded();await page.waitForTimeout(100);assert.equal(await page.locator('.mobile-purchase').isVisible(),false);
  await page.locator('#product-faq').scrollIntoViewIfNeeded();await page.waitForTimeout(100);assert.equal(await page.locator('.mobile-purchase').isVisible(),true);
 });
 await check('Keyboard: skip link, menu/search/cart focus containment and Escape restoration',async()=>{
  await go('/');await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Enter');assert.equal(await page.locator('main').evaluate(el=>el===document.activeElement),true);
  const search=page.getByRole('button',{name:'Search',exact:true});await search.click();assert.equal(await page.locator('#site-search').evaluate(el=>el===document.activeElement),true);
  for(let i=0;i<8;i++)await page.keyboard.press('Tab');assert.equal(await page.locator('.search-cover').evaluate(el=>el.contains(document.activeElement)),true);
  await page.keyboard.press('Escape');assert.equal(await search.evaluate(el=>el===document.activeElement),true);
  await page.getByRole('button',{name:/Open shopping bag/}).click();for(let i=0;i<20;i++)await page.keyboard.press('Tab');assert.equal(await page.locator('.cart-drawer').evaluate(el=>el.contains(document.activeElement)),true);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Open menu',exact:true}).click();assert.equal(await page.locator('.mobile-nav-panel').evaluate(el=>el.contains(document.activeElement)),true);await page.keyboard.press('Escape');
 });
 await check('URL-backed search, brand/price/caffeine filtering, price sort and empty-state recovery',async()=>{
  await go('/shop');await page.locator('#catalog-query').fill('creatine');await page.locator('#catalog-search button').click();assert.equal(await page.locator('.shop-grid .product-card').count(),1);
  await page.locator('.filter-disclosure').evaluate(el=>el.open=true);await page.selectOption('#price-choice','3000');assert.equal(await page.locator('.shop-grid .product-card').count(),1);await page.reload();await page.locator('main').waitFor();assert.equal(await page.locator('#catalog-query').inputValue(),'creatine');
  await page.selectOption('#stimulant-choice','free');assert.equal(await page.locator('.empty-shop').count(),1);await page.locator('.empty-shop a').click();
  await page.selectOption('#sort-choice','price-low');const prices=await page.locator('.product-pricing strong').allTextContents();const nums=prices.map(s=>Number(s.replace(/[^0-9.]/g,'')));assert.deepEqual(nums,[...nums].sort((a,b)=>a-b));
 });
 await check('Cancelled checkout retains bag and explains cancellation',async()=>{await go('/cart?cancelled=1');assert.match(await page.locator('.cart-notice').innerText(),/bag is saved/);});
 const responsive=[];
 for(const width of [1440,1024,390,430]){
  await page.setViewportSize({width,height:width<600?844:1000});
  for(const [name,path] of [['homepage','/'],['fortivor','/product/fortivor-pre-workout'],['catalog','/shop'],['stack','/build-your-stack']]){
   await go(path);await page.evaluate(()=>document.fonts.ready);await readyImages();
   await page.screenshot({path:`screenshots/${name}-${width}.png`,fullPage:false});
   const data=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src),h1:document.querySelectorAll('h1').length}));
   assert.ok(data.scrollWidth<=width,`${name} at ${width}: overflow ${data.scrollWidth}`);assert.equal(data.h1,1);assert.deepEqual(data.broken,[]);
   if(name==='homepage'){const ctas=await page.locator('.campaign-actions').boundingBox();assert.ok(ctas.y+ctas.height<= (width<600?844:1000),`Hero CTAs below fold ${width}`);}
   responsive.push({page:name,width,overflow:false,brokenImages:0});
  }
 }
 results.push({name:'Responsive screenshots, no horizontal overflow, hero CTAs above fold: 1440/1024/390/430',status:'passed',responsive});
 await page.setViewportSize({width:1440,height:1000});await go('/');await readyImages();await page.screenshot({path:'screenshots/homepage-desktop-full.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await go('/product/fortivor-pre-workout');await readyImages();await page.screenshot({path:'screenshots/fortivor-mobile-full.png',fullPage:true});
 assert.deepEqual(errors,[]);results.push({name:'No browser JavaScript exceptions',status:'passed'});
 await fs.writeFile('docs/browser-results.json',JSON.stringify({testedAt:new Date().toISOString(),engine:'Chromium',base,results,errors},null,2));
 console.log(`Completed ${results.length} checks; ${responsive.length} responsive page renders.`);
}catch(error){await page.screenshot({path:'/workspace/scratch/qa-failure.png',fullPage:true});console.error(error);await fs.writeFile('docs/browser-results.json',JSON.stringify({results,errors,failure:error.message},null,2));process.exitCode=1;}finally{await browser.close();}
