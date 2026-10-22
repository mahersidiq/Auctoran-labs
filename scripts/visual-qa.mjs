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
const routes=[['homepage','/'],['catalog','/shop'],['fortivor','/product/fortivor-pre-workout'],['protein','/product/sample-whey-isolate'],['creatine','/product/sample-creatine'],['aminos','/product/sample-amino'],['vitamins','/product/sample-vitamins'],['thermogenic','/product/sample-fat-burner'],['about','/about'],['stack','/build-your-stack'],['shipping','/info/shipping'],['returns','/info/returns'],['privacy','/info/privacy'],['terms','/info/terms'],['contact','/contact'],['empty-bag','/cart']];
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
    const clipped=[...document.querySelectorAll('.v4-product-art>img,.product-image>img,.detail-main-image .real-product-img,.category-visual img')].filter(img=>{
     const a=img.getBoundingClientRect(),b=img.parentElement.getBoundingClientRect();return a.width>b.width+2||a.height>b.height+2;
    }).map(img=>img.src);
    return {overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),oldImages:[...document.images].filter(i=>/gallery\.webp|athlete\.jpg|ritual-sculpture|deadlift-editorial/.test(i.src)).map(i=>i.src),lowContrast,clipped};
   });
   assert.equal(metrics.overflow,false,`${name} ${width}: horizontal overflow`);
   assert.equal(metrics.h1,1,`${name}: single page heading`);
   for(const key of ['broken','oldImages','lowContrast','clipped'])assert.deepEqual(metrics[key],[],`${name} ${width}: ${key}`);
   if(name==='homepage')assert.equal(await page.locator('.category-visual').count(),6);
   if(name==='fortivor')assert.equal(await page.locator('.detail-image-row button').count(),2);
   if(['protein','creatine','aminos','vitamins','thermogenic'].includes(name)){
    assert.match(await page.locator('.gallery-caption').innerText(),/Illustrative/);
    assert.equal(await page.locator('.gallery-tools button').count(),0);
   }
   renders.push({page:name,width,status:'passed'});
   if([1440,390].includes(width)&&['about','shipping','contact','protein','stack','empty-bag','catalog'].includes(name))await page.screenshot({path:`screenshots/refresh-${name}-${width}-full.jpg`,type:'jpeg',quality:80,fullPage:true});
   if(name==='homepage'&&width===390){
    await page.locator('.v4-flagship').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-100));
    await page.screenshot({path:'screenshots/refresh-fortivor-framing-mobile.jpg',type:'jpeg',quality:85});
   }
  }
  console.log(`PASS all ${routes.length} pages at ${width}px: image bounds, contrast, loading and overflow`);
 }
 checks.push('All 16 customer routes at four widths; visible headings/navigation, bounded product images, no legacy media, missing assets or horizontal overflow');
 await go('/');
 for(const key of ['pre-workout','protein','creatine','aminos','vitamins','fat-burners']){
  await page.locator(`.category-visual[href="/shop?category=${key}"]`).click();
  assert.equal(new URL(page.url()).searchParams.get('category'),key);
  assert.equal(await page.locator('.shop-grid .product-card').count(),1);await go('/');
 }
 checks.push('All six photographic category tiles open the correct filtered catalog');
 await go('/info/shipping');await page.locator('.care-navigation a[href="/info/returns"]').click();
 assert.equal(await page.locator('.care-navigation [aria-current="page"]').innerText(),'Returns');
 await page.locator('.care-navigation a[href="/contact"]').click();assert.equal(await page.locator('h1').innerText(),'CONTACT.');
 checks.push('Customer care navigation changes route and active state correctly');
 await page.setViewportSize({width:390,height:844});await go('/product/fortivor-pre-workout');
 await page.getByRole('button',{name:'View Supplement Facts',exact:true}).click();
 const normal=await page.locator('.detail-gallery-image img').boundingBox();await page.locator('.detail-gallery-image').click();
 const zoom=await page.locator('.zoom-content img').boundingBox();assert.ok(zoom.width>normal.width*1.4,'Mobile zoom must genuinely enlarge the label');
 await page.keyboard.press('Escape');checks.push('Mobile facts zoom genuinely enlarges the label and Escape closes it');
 assert.deepEqual(errors,[]);
 await fs.writeFile('docs/visual-results.json',JSON.stringify({testedAt:new Date().toISOString(),engine:'Chromium',base,renders,checks,errors},null,2));
 console.log(`Completed ${renders.length} responsive page renders and ${checks.length} visual/discovery checks.`);
}catch(error){
 await page.screenshot({path:'/workspace/scratch/visual-qa-failure.jpg',type:'jpeg',fullPage:true});
 await fs.writeFile('docs/visual-results.json',JSON.stringify({renders,checks,errors,failure:error.message},null,2));console.error(error);process.exitCode=1;
}finally{await browser.close();}
