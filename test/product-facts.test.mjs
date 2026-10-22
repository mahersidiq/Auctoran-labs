import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import products from '../data/products.json' with {type:'json'};
const p=products.find(p=>p.id==='fortivor-pre-workout');
test('owner-supplied formula replaces the earlier five-ingredient concept',()=>{
 assert.equal(p.formula.length,10);
 assert.equal(p.formula.find(f=>f.name==='Alpha-GPC (50%)').amountMg,300);
 assert.equal(p.formula.find(f=>f.name==='Betaine Anhydrous').amountMg,2500);
 assert.equal(p.formula.find(f=>f.name==='Taurine').amountMg,2000);
 assert.equal(p.formula.some(f=>f.name==='L-Theanine'),false);
 assert.equal(p.flavor,'Blue Raspberry Watermelon');
});
test('caffeine includes guarana and unresolved serving mass cannot imply an approved complete label',()=>{
 const caffeine=p.caffeineSources.reduce((sum,s)=>sum+s.amountMg*s.caffeineFraction,0);
 assert.equal(caffeine,355);assert.equal(p.caffeineMg,caffeine);
 assert.equal(p.formula.reduce((sum,i)=>sum+i.amountMg,0),18650);
 assert.equal(p.servingSizeVerified,false);assert.equal(p.labelVerified,false);
 assert.equal(p.directionsVerified,false);assert.equal(p.suggestedUse,undefined);
});
test('gallery contains only the corrected front and flat supplied Supplement Facts',async()=>{
 assert.equal(p.gallery.length,2);
 assert.equal(p.gallery[0].src,'/assets/fortivor-studio-front.webp');
 assert.deepEqual(p.gallery.slice(1).map(g=>g.kind),['label']);
 const facts=await readFile(new URL('../public'+p.supplementFactsImage,import.meta.url),'utf8');
 assert.match(facts,/Supplement Facts/);assert.match(facts,/Guarana Extract/);assert.match(facts,/1 Scoop \(18 g\)/);
 assert.doesNotMatch(facts,/<image/);
 assert.deepEqual(p.gallery.map(g=>g.label),['Front view','Supplement Facts']);
});
