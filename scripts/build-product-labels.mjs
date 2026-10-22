// Typeset the supplied packaging label directly; never synthesize ingredient text.
import {writeFile} from 'node:fs/promises';
import products from '../data/products.json' with {type:'json'};
const p=products.find(p=>p.id==='fortivor-pre-workout');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const wrap=(text,length=64)=>{
 const lines=[];let line='';for(const word of String(text).split(/\s+/)){if(line&&line.length+word.length+1>length){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;
};
const text=(x,y,value,size=32,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(value)}</text>`;
const rule=(x,y,width,weight=1.5)=>`<path d="M${x} ${y}h${width}" stroke="#ad9472" stroke-width="${weight}"/>`;
const header=(width,title,description)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="1400" viewBox="0 0 ${width} 1400" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><defs><radialGradient id="paper" cx="20%" cy="20%" r="100%"><stop offset="0" stop-color="#202020"/><stop offset="1" stop-color="#0b0b0c"/></radialGradient></defs><rect width="${width}" height="1400" fill="url(#paper)"/><g fill="#e4d8c4" font-family="Arial, Helvetica, sans-serif">`;
function factsTable(x,y,width){
 let svg=text(x,y,'SUPPLEMENT FACTS',36,'fill="#ccb08a" letter-spacing="7"');
 svg+=text(x,y+57,`Serving Size: ${p.sourceLabel.servingSize}`,30)+text(x,y+100,`Servings Per Container: ${p.sourceLabel.servings}`,30)+rule(x,y+126,width,2);
 svg+=text(x+width,y+169,'Amount Per Serving',27,'text-anchor="end"')+rule(x,y+194,width,1.5);
 p.formula.forEach((f,i)=>{const rowY=y+245+i*63;svg+=text(x,rowY,f.name,32)+text(x+width,rowY,f.amount,32,'text-anchor="end"')+rule(x,rowY+22,width,0.8);});
 svg+=rule(x,y+878,width,2);
 const other=wrap(`Other Ingredients: ${p.otherIngredients.join(', ')}.`,Math.floor(width/16));
 other.forEach((l,i)=>svg+=text(x,y+932+i*43,l,28));
 return svg;
}
let facts=header(1200,'Fortivor Supplement Facts — supplied packaging label',p.supplementFactsText);
facts+=factsTable(90,170,1020);
facts+='</g></svg>\n';
await writeFile(new URL('../public/assets/fortivor-supplement-facts.svg',import.meta.url),facts);

console.log('Typeset the supplied black-and-gold Supplement Facts. Product rendering unchanged.');
