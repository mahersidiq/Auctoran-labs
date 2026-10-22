// Optional browser regression checks for the storefront's visual presentation.
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs'));
const base=process.env.QA_BASE_URL||'http://localhost:3000';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({reducedMotion:'reduce'});
const errors=[],renders=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base+'/assets/'))errors.push(`${r.status()} ${r.url()}`);});
const routes=[['homepage','/'],['catalog','/shop'],['pre-workout-category','/shop?category=pre-workout'],['protein-category','/shop?category=protein'],['fortivor','/product/fortivor-pre-workout'],['protein','/product/sample-whey-isolate'],['creatine','/product/sample-creatine'],['aminos','/product/sample-amino'],['vitamins','/product/sample-vitamins'],['thermogenic','/product/sample-fat-burner'],['about','/about'],['stack','/build-your-stack'],['shipping','/info/shipping'],['returns','/info/returns'],['privacy','/info/privacy'],['terms','/info/terms'],['contact','/contact'],['empty-bag','/cart']];
const go=async path=>{await page.goto(base+path);await page.locator('main').waitFor();};
const ready=()=>page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await document.fonts.ready;});
try{
 for(const width of [1440,1024,390,430]){
  await page.setViewportSize({width,height:width<700?844:1000});
  for(const [name,path] of routes){
   await go(path);await ready();
   const metrics=await page.evaluate(()=>{
    const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);
    const luminance=c=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
    const contrast=el=>{
     let bg=[17,17,15],node=el;
     while(node){const c=rgb(getComputedStyle(node).backgroundColor);if(c.length===3||c[3]===1){bg=c;break;}node=node.parentElement;}
     const a=luminance(rgb(getComputedStyle(el).color)),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    };
    const selected=[...document.querySelectorAll('main h1, main h2, .category-visual>span, .care-navigation a')];
    const lowContrast=selected.filter(el=>contrast(el)<3).map(el=>({text:el.textContent.trim(),ratio:contrast(el)}));
    const clipped=[...document.querySelectorAll('.v4-product-art>img,.product-image>img,.detail-main-image .real-product-img,.category-visual img,.category-shop-hero .shop-hero-photo img')].filter(img=>{
     const a=img.getBoundingClientRect(),b=img.parentElement.getBoundingClientRect();return a.width>b.width+2||a.height>b.height+2;
    }).map(img=>img.src);
    return {overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),oldImages:[...document.images].filter(i=>/gallery\.webp|athlete\.jpg|ritual-sculpture|deadlift-editorial|editorial-architecture|editorial-preparation\.webp|collection-(protein|creatine|aminos|vitamins|thermogenic)\.webp|\/studio-(protein|creatine|aminos|vitamins|thermogenic)/.test(i.src)).map(i=>i.src),lowContrast,clipped};
   });
   assert.equal(metrics.overflow,false,`${name} ${width}: horizontal overflow`);
   assert.equal(metrics.h1,1,`${name}: single page heading`);
   for(const key of ['broken','oldImages','lowContrast','clipped'])assert.deepEqual(metrics[key],[],`${name} ${width}: ${key}`);
   if(name==='homepage'){
    assert.equal(await page.locator('.category-visual').count(),6);
    assert.equal(await page.locator('img[src*="editorial-women-"]').count(),2);
    assert.equal(await page.locator('.editorial-athlete img[src*="editorial-training"]').count(),1);
   }
   if(name==='about')assert.equal(await page.locator('img[src*="editorial-women-"]').count(),2);
   if(name.endsWith('-category')){
    const product=await page.locator('.category-shop-hero .shop-hero-photo img').boundingBox();
    assert.ok(product.width>width*.35 && product.height>250,`${name} ${width}: product stage must be prominent`);
    if(width<700)assert.ok((await page.locator('.single-product .product-image').boundingBox()).width>width*.8);
   }
   if(name==='fortivor')assert.equal(await page.locator('.detail-image-row button').count(),2);
   if(['protein','creatine','aminos','vitamins','thermogenic'].includes(name)){
    assert.match(await page.locator('.gallery-caption').innerText(),/Design concept/);
    assert.equal(await page.locator('.gallery-tools button').count(),0);
    assert.equal(await page.locator('.pdp-formula').count(),0,'Concepts must not inherit the Fortivor formula');
   }
   renders.push({page:name,width,status:'passed'});
   if([1440,390].includes(width)&&['about','shipping','contact','protein','stack','empty-bag','catalog','pre-workout-category','protein-category'].includes(name))await page.screenshot({path:`screenshots/refresh-${name}-${width}-full.jpg`,type:'jpeg',quality:80,fullPage:true});
   if(name==='homepage'&&[1440,390].includes(width)){
    await page.locator('.v4-editorial').screenshot({path:`screenshots/inclusive-training-${width}.jpg`,type:'jpeg',quality:85});
   }
   if(name==='homepage'&&width===390){
    await page.locator('.v4-flagship').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-100));
    await page.screenshot({path:'screenshots/refresh-fortivor-framing-mobile.jpg',type:'jpeg',quality:85});
   }
  }
  console.log(`PASS all ${routes.length} pages at ${width}px: image bounds, contrast, loading and overflow`);
 }
 checks.push('All 18 customer routes at four widths; prominent category products, balanced athlete imagery, no standalone column, missing assets or horizontal overflow');
 await go('/');
 for(const key of ['pre-workout','protein','creatine','aminos','vitamins','fat-burners']){
  await page.locator(`.category-visual[href="/shop?category=${key}"]`).click();
  assert.equal(new URL(page.url()).searchParams.get('category'),key);
  assert.equal(await page.locator('.shop-grid .product-card').count(),1);await go('/');
 }
 checks.push('All six photographic category tiles open the correct filtered catalog');
 await go('/shop');await page.locator('.filter-disclosure summary').click();await page.selectOption('#brand-choice','house');assert.equal(await page.locator('.shop-grid .product-card').count(),6);
 await page.selectOption('#brand-choice','concept');assert.equal(await page.locator('.shop-grid .product-card').count(),5);
 assert.equal(await page.locator('.shop-grid .product-card .product-preview-tag').filter({hasText:'DESIGN CONCEPT'}).count(),5);
 await page.selectOption('#brand-choice','partner');assert.equal(await page.locator('.empty-shop').count(),1);
 checks.push('Auctoran branded concepts have their own filter and are not misrepresented as curated partner inventory');
 await go('/info/shipping');await page.locator('.care-navigation a[href="/info/returns"]').click();
 assert.equal(await page.locator('.care-navigation [aria-current="page"]').innerText(),'Returns');
 await page.locator('.care-navigation a[href="/contact"]').click();assert.equal(await page.locator('h1').innerText(),'CONTACT.');
 checks.push('Customer care navigation changes route and active state correctly');
 await page.setViewportSize({width:390,height:844});await go('/product/fortivor-pre-workout');
 await page.getByRole('button',{name:'View Supplement Facts',exact:true}).click();
 const normal=await page.locator('.detail-gallery-image img').boundingBox();await page.locator('.detail-gallery-image').click();
 const zoom=await page.locator('.zoom-content img').boundingBox();assert.ok(zoom.width>normal.width*1.4,'Mobile zoom must genuinely enlarge the label');
 await page.keyboard.press('Escape');checks.push('Mobile facts zoom genuinely enlarges the label and Escape closes it');
 const productRoutes=['fortivor-pre-workout','sample-whey-isolate','sample-creatine','sample-amino','sample-vitamins','sample-fat-burner'];
 for(const width of [1440,1024,390,430]){
  await page.setViewportSize({width,height:width<700?844:1000});
  for(const slug of productRoutes){
   await go('/product/'+slug);await ready();
   const normal=await page.locator('.detail-gallery-image img').boundingBox();
   await page.locator('.detail-gallery-image').click();
   await page.locator('.zoom-content img').evaluate(i=>i.decode());
   const enlarged=await page.locator('.zoom-content img').boundingBox();
   assert.ok(enlarged.width>normal.width*1.4,`${slug} ${width}: clicking must enlarge the product`);
   const source=await page.locator('.zoom-content img').evaluate(i=>i.currentSrc);
   assert.ok(!source.includes('-mobile.'),'Zoom must use the full-resolution product image');
   const centered=await page.locator('.zoom-content').evaluate(el=>Math.abs(el.scrollLeft-(el.scrollWidth-el.clientWidth)/2)<2);
   assert.equal(centered,true,'Enlargement must open centered on the product');
   await page.getByRole('button',{name:'FULL VIEW',exact:true}).click();
   const fitted=await page.locator('.zoom-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1);
   assert.equal(fitted,true,'Full view must show the complete image without scrolling');
   if(width===390&&slug==='fortivor-pre-workout')await page.screenshot({path:'screenshots/product-full-view-mobile.jpg',type:'jpeg',quality:85});
   await page.getByRole('button',{name:'ZOOM IN',exact:true}).click();
   assert.equal(await page.locator('.zoom-scale').getAttribute('aria-pressed'),'true');
   if(width===390&&slug==='sample-creatine')await page.screenshot({path:'screenshots/product-enlarged-mobile.jpg',type:'jpeg',quality:85});
   for(let i=0;i<6;i++)await page.keyboard.press('Tab');
   assert.equal(await page.locator('#gallery-zoom').evaluate(el=>el.contains(document.activeElement)),true);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#gallery-zoom').evaluate(el=>el.open),false);
   assert.equal(await page.locator('.detail-gallery-image').evaluate(el=>el===document.activeElement),true);
  }
 }
 checks.push('All six product images genuinely enlarge, load full-resolution sources, center correctly, fit completely and support keyboard controls at four widths (24 gallery checks)');
 const phone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const retina=await phone.newPage();retina.on('pageerror',e=>errors.push(e.message));
 for(const category of ['pre-workout','protein']){
  await retina.goto(base+'/shop?category='+category);await retina.locator('.single-product').waitFor();
  for(const selector of ['.shop-hero-photo img','.single-product .product-image img']){
   const source=await retina.locator(selector).evaluate(async image=>{await image.decode();return image.currentSrc;});
   assert.ok(!source.includes('-mobile.'),'Large category products must use sharp sources on high-density phones');
  }
  await retina.locator('.shop-hero-photo a').click();await retina.locator('.detail-gallery-image').waitFor();
  assert.ok(new URL(retina.url()).pathname.startsWith('/product/'),'Category product photography must open the matching product page');
 }
 await phone.close();checks.push('Full-width category products use sharp sources on a 3× density phone and their photos open the product page');
 assert.deepEqual(errors,[]);
 await fs.writeFile('docs/visual-results.json',JSON.stringify({testedAt:new Date().toISOString(),engine:'Chromium',base,renders,checks,errors},null,2));
 console.log(`Completed ${renders.length} responsive page renders and ${checks.length} visual/discovery checks.`);
}catch(error){
 await page.screenshot({path:'/workspace/scratch/visual-qa-failure.jpg',type:'jpeg',fullPage:true});
 await fs.writeFile('docs/visual-results.json',JSON.stringify({renders,checks,errors,failure:error.message},null,2));console.error(error);process.exitCode=1;
}finally{await browser.close();}
