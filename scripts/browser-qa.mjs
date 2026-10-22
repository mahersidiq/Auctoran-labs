// Optional browser QA. Generated reports and screenshots stay in ignored storage/.
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs'));
const base=process.env.QA_BASE_URL||'http://localhost:3000';
const output=path.resolve(process.env.QA_OUTPUT_DIR||'storage/qa');
await fs.mkdir(output,{recursive:true});
const startedAt=new Date().toISOString(),results=[],errors=[],renders=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage(),product='/product/fortivor-pre-workout';
page.on('pageerror',e=>errors.push(e.message));
const go=async route=>{await page.goto(base+route);await page.locator('main').waitFor();};
const check=async(name,run)=>{await run();results.push({name,status:'passed'});console.log('PASS '+name);};
const readyImages=async()=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(async i=>{i.loading='eager';try{await i.decode();}catch{}}));});
try{
 await check('Only Fortivor is public; old catalog and stack routes lead to Fortivor',async()=>{
  const {products}=await(await page.request.get(base+'/api/products')).json();assert.deepEqual(products.map(p=>p.id),['fortivor-pre-workout']);
  for(const route of ['/shop','/shop?category=protein','/build-your-stack']){await go(route);assert.equal(new URL(page.url()).pathname,product);assert.match(await page.locator('h1').innerText(),/Fortivor/i);}
  await go('/product/sample-creatine');assert.match(await page.locator('main').innerText(),/PAGE NOT FOUND/);
  await go('/');assert.equal(await page.locator('a[href*="category="],a[href="/build-your-stack"]').count(),0);
  assert.equal(await page.locator('img[src*="campaign-strength"],img[src*="campaign-partners"],img[src*="campaign-crew"],img[src*="campaign-run"]').count(),0);
  assert.equal(await page.locator('.hero-packshot img[src*="fortivor-studio-front"]').count(),1);
 });
 await check('Homepage comparison gives sourced advantages and discloses every compared dose',async()=>{
  await go('/');await page.locator('.hero-compare').click();assert.equal(new URL(page.url()).hash,'#compare');
  const table=page.locator('.comparison-table');assert.match(await table.innerText(),/GHOST Legend V5/);assert.match(await table.innerText(),/Gorilla Mode/);
  assert.equal(await table.locator('td[data-brand="fortivor"][data-metric="citrullineMg"]').innerText(),'8 g');
  assert.equal(await table.locator('td[data-brand="gorilla"][data-metric="citrullineMg"]').innerText(),'10 g');
  assert.equal(await table.locator('td[data-brand="gorilla"][data-metric="betaAlanineMg"]').innerText(),'Not listed');
  assert.match(await table.locator('thead').innerText(),/2 scoops · maximum dose/);
  assert.match(await page.locator('.comparison-wins').innerText(),/33%/);assert.match(await page.locator('.comparison-wins').innerText(),/2×/);
  assert.match(await page.locator('#comparison-note').innerText(),/proposed specifications/);
  await page.locator('.comparison-sources summary').click();assert.equal(await page.locator('.comparison-sources a').count(),6);
  await page.setViewportSize({width:390,height:844});const scroller=page.locator('.comparison-scroll');await scroller.focus();
  await scroller.evaluate(el=>el.scrollLeft=el.scrollWidth);assert.ok(await scroller.evaluate(el=>el.scrollLeft>0));
  await page.setViewportSize({width:1440,height:1000});
 });
 await check('Homepage add, quantity, demo checkout and retained bag',async()=>{
  await go('/');await page.locator('.fortivor-feature [data-action="add"]').click();await page.locator('.cart-drawer.active').waitFor();
  await page.locator('.cart-drawer [data-action="increase"]').click();assert.match(await page.locator('.drawer-subtotal').innerText(),/99\.98/);
  await page.locator('.cart-drawer a[href="/cart"]').click();await page.getByRole('button',{name:'TRY DEMO CHECKOUT'}).click();await page.locator('.order-page').waitFor();
  assert.match(await page.locator('.order-page').innerText(),/No payment was collected/);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('auctoran-cart-v1'))),[{id:'fortivor-pre-workout',qty:2}]);
 });
 await check('Cart restoration removes archived products and preserves Fortivor quantities',async()=>{
  await page.evaluate(()=>localStorage.setItem('auctoran-cart-v1',JSON.stringify([{id:'sample-creatine',qty:2},{id:'fortivor-pre-workout',qty:1},{id:'fortivor-pre-workout',qty:2}])));
  await go('/cart');assert.equal(await page.locator('.cart-page .cart-line').count(),1);assert.match(await page.locator('.summary-total').innerText(),/149\.97/);
  await page.locator('.cart-page .cart-line [data-action="decrease"]').click();await page.reload();await page.locator('.cart-page .cart-line').waitFor();assert.match(await page.locator('.summary-total').innerText(),/99\.98/);
 });
 await check('Checkout failure allows retry and cancelled checkout keeps the bag',async()=>{
  await page.route('**/api/checkout',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Checkout is temporarily unavailable. Please try again.'})}));
  await page.getByRole('button',{name:'TRY DEMO CHECKOUT'}).click();await page.locator('#checkout-error').filter({hasText:'temporarily unavailable'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'TRY DEMO CHECKOUT'}).isEnabled(),true);assert.equal(await page.locator('.cart-page .cart-line').count(),1);await page.unroute('**/api/checkout');
  await go('/cart?cancelled=1');assert.match(await page.locator('.cart-notice').innerText(),/bag is saved/);
 });
 await check('Product gallery, zoom, selected highlights and pending label status',async()=>{
  await go(product);await page.getByRole('button',{name:'View Flavor campaign',exact:true}).click();await page.getByRole('button',{name:'Enlarge Flavor campaign',exact:true}).click();
  await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
  await page.locator('.product-jumps a[href="#formula"]').click();assert.equal(new URL(page.url()).hash,'#formula');assert.equal(await page.locator('.interactive-formula details').count(),3);
  assert.doesNotMatch(await page.locator('.interactive-formula').innerText(),/Alpha-GPC|Theobromine|L-Theanine/);
  await page.locator('#supplement-information summary').filter({hasText:'LABEL STATUS'}).click();assert.match(await page.locator('#supplement-information').innerText(),/final production Supplement Facts/i);
  assert.equal(await page.locator('a[href*="fortivor-supplement-facts"]').count(),0);
 });
 await check('Keyboard skip link, bag focus containment and restoration',async()=>{
  await go('/');await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Enter');assert.equal(await page.locator('main').evaluate(el=>el===document.activeElement),true);
  const bag=page.getByRole('button',{name:/Open shopping bag/});await bag.click();for(let i=0;i<15;i++)await page.keyboard.press('Tab');assert.equal(await page.locator('.cart-drawer').evaluate(el=>el.contains(document.activeElement)),true);
  await page.keyboard.press('Escape');assert.equal(await bag.evaluate(el=>el===document.activeElement),true);
 });
 await check('Mobile menu, direct formula navigation, quantity and sticky purchase',async()=>{
  await page.setViewportSize({width:390,height:844});await go('/');await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.locator('.mobile-nav-panel a[href="'+product+'#formula"]').click();
  assert.equal(new URL(page.url()).hash,'#formula');assert.equal(await page.locator('#formula').evaluate(el=>el===document.activeElement),true);assert.equal(await page.locator('.mobile-nav-panel').getAttribute('aria-hidden'),'true');
  await go(product);await page.getByRole('button',{name:'Increase quantity',exact:true}).click();assert.equal(await page.locator('.purchase-controls output').innerText(),'2');
  await page.locator('#formula').scrollIntoViewIfNeeded();await page.locator('.mobile-purchase:not([hidden])').waitFor();await page.locator('.mobile-purchase [data-action="addDetail"]').click();await page.locator('.cart-drawer.active').waitFor();await page.keyboard.press('Escape');
 });
 await check('Six routes fit five viewport sizes with loaded images and one h1',async()=>{
  for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:width<600?844:1000});
   for(const [name,route] of [['homepage','/'],['fortivor',product],['about','/about'],['cart','/cart'],['contact','/contact'],['shipping','/info/shipping']]){
    await go(route);await readyImages();const d=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.currentSrc)}));
    assert.ok(d.scrollWidth<=width,`${name} overflow at ${width}: ${d.scrollWidth}`);assert.equal(d.h1,1,name);assert.deepEqual(d.broken,[],name);
    if(name==='homepage'){const cta=await page.locator('.campaign-actions .btn').boundingBox();assert.ok(cta.y+cta.height<=(width<600?844:1000),'Hero purchase link below fold at '+width);}
    if(['homepage','fortivor','about'].includes(name))await page.screenshot({path:path.join(output,`${name}-${width}.jpg`),type:'jpeg',quality:82,fullPage:false});
    renders.push({page:name,width,overflow:false,brokenImages:0});
   }
  }
  await go('/');await readyImages();await page.screenshot({path:path.join(output,'homepage-desktop-full.jpg'),type:'jpeg',quality:82,fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'homepage-mobile-full.jpg'),type:'jpeg',quality:82,fullPage:true});
 });
 assert.deepEqual(errors,[]);results.push({name:'No browser JavaScript exceptions',status:'passed'});console.log(`Completed ${results.length} checks; ${renders.length} responsive page renders.`);
}catch(error){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});results.push({name:'Browser validation',status:'failed',message:error.message});console.error(error);process.exitCode=1;}
finally{await fs.writeFile(path.join(output,'browser-results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),base,results,renders,errors},null,2));await browser.close();}
