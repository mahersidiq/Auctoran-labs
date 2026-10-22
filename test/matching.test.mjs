import { test } from 'node:test';
import assert from 'node:assert/strict';
import {matchProducts,normalizeCart} from '../public/src/matching.js';
const item=(id,categoryKey,caffeineMg=0,priceCents=2000)=>({id,categoryKey,name:id,priceCents,caffeineMg,caffeineVerified:true,stimulant:caffeineMg>0?'caffeinated':'stimulant-free',stimulantVerified:true,inStock:true,inventoryConfirmed:true,inventoryQuantity:12,priceConfirmed:true,labelVerified:true,category:categoryKey});
test('matches goals and preferences deterministically, with one stimulant and no sample inventory',()=>{
 const products=[item('pre-a','pre-workout',300),item('pre-b','pre-workout',200),item('creatine','creatine'),item('protein','protein'),{...item('sample','protein'),isSample:true}];
 const prefs={goal:'strength',stimulant:'any'};
 const result=matchProducts(products,prefs);
 assert.deepEqual(result.map(r=>r.product.id),['creatine','protein','pre-a']);
 assert.deepEqual(matchProducts([...products].reverse(),prefs).map(r=>r.product.id),['creatine','protein','pre-a']);
 assert.equal(result.filter(r=>r.product.caffeineMg>0).length,1);
 assert.deepEqual(matchProducts(products,{goal:'strength',stimulant:'free'}).map(r=>r.product.id),['creatine','protein']);
 assert.deepEqual(matchProducts(products,{goal:'recovery',categories:['creatine']}),[]);
});
test('budget applies to the combined suggested selection',()=>{
 const products=[item('creatine','creatine',0,2500),item('protein','protein',0,3000),item('pre','pre-workout',300,4000)];
 const results=matchProducts(products,{goal:'strength',budgetCents:5000});
 assert.equal(results.reduce((sum,r)=>sum+r.product.priceCents,0),2500);
 assert.deepEqual(matchProducts(products,{goal:'strength',budgetCents:2000}),[]);
});
test('unconfirmed stock, price, labeling and caffeine data never become live recommendations',()=>{
 const good=item('good','pre-workout',300);
 for(const change of [{inventoryConfirmed:false},{inStock:false},{priceConfirmed:false},{labelVerified:false},{caffeineVerified:false},{isSample:true}])assert.deepEqual(matchProducts([{...good,...change}],{goal:'training-performance'}),[]);
});
test('concept matching is opt-in, preview-only, and excludes sample partners and stimulant-free choices',()=>{
 const demo={...item('fortivor','pre-workout',300,4999),inStock:false,inventoryConfirmed:false,priceConfirmed:false,labelVerified:false,caffeineVerified:false,isOwn:true,demoAvailable:true};
 assert.equal(matchProducts([demo],{goal:'training-performance',allowPreview:true},{preview:true}).length,1);
 assert.equal(matchProducts([demo],{goal:'training-performance'},{preview:true}).length,0);
 assert.equal(matchProducts([demo],{goal:'training-performance',allowPreview:true},{preview:false}).length,0);
 assert.equal(matchProducts([demo],{goal:'training-performance',allowPreview:true,stimulant:'free'},{preview:true}).length,0);
 assert.equal(matchProducts([{...demo,isSample:true}],{goal:'training-performance',allowPreview:true},{preview:true}).length,0);
});
test('cart restoration merges duplicate IDs, rejects malformed data, caps stock and removes unavailable products',()=>{
 const catalog=[item('a','protein'),{...item('b','creatine'),inventoryQuantity:0},{...item('demo','pre-workout'),inventoryConfirmed:false,demoAvailable:true}];
 assert.deepEqual(normalizeCart([{id:'a',qty:9},{id:'a',qty:9},{id:'b',qty:1},{id:'missing',qty:2},{id:'a',qty:0},{id:'a',qty:1.2},{id:'demo',qty:200},null],catalog),[{id:'a',qty:12},{id:'demo',qty:20}]);
 assert.deepEqual(normalizeCart('broken',catalog),[]);
});
