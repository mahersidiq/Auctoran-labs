// Deterministic catalog matching. No health profile, clinical claims, or sample brands.
export const GOALS = [
  ['strength', 'Strength', 'A considered foundation for your lifting routine.'],
  ['muscle-growth', 'Muscle Growth', 'Explore the categories that fit your training.'],
  ['training-performance', 'Training Performance', 'Preparation for the sessions ahead.'],
  ['recovery', 'Recovery', 'Essentials for the time between sessions.'],
  ['general-wellness', 'General Wellness', 'Keep your everyday routine considered.']
];
export const CATEGORIES = [['pre-workout','Pre-Workout'],['protein','Protein'],['creatine','Creatine'],['aminos','Aminos'],['vitamins','Vitamins'],['fat-burners','Fat Burners']];
const goalCategories = {
  strength: ['creatine','protein','pre-workout'],
  'muscle-growth': ['protein','creatine','aminos'],
  'training-performance': ['pre-workout','creatine','aminos'],
  recovery: ['protein','aminos'],
  'general-wellness': ['vitamins']
};
export function matchProducts(catalog, preferences = {}, {preview = false} = {}) {
  const preferred = goalCategories[preferences.goal] || [];
  const categories = preferences.categories?.length ? preferences.categories : preferred;
  const budget = Number(preferences.budgetCents) || Infinity;
  const stimulant = preferences.stimulant || 'any';
  const allowPreview = preview && preferences.allowPreview === true;
  const candidates = catalog.filter(p => {
    if (p.isSample || p.active === false || !preferred.includes(p.categoryKey) || !categories.includes(p.categoryKey)) return false;
    const verified = p.inStock && p.inventoryConfirmed && p.priceConfirmed && p.labelVerified;
    if (!verified && !(allowPreview && p.isOwn && p.demoAvailable)) return false;
    const caffeineKnown = (p.caffeineVerified && Number.isFinite(p.caffeineMg) && p.caffeineMg >= 0) || (allowPreview && p.isOwn && Number.isFinite(p.caffeineMg));
    // Unknown stimulant data is never inferred from a category name.
    if (!caffeineKnown) return false;
    if (p.caffeineMg === 0 && !(p.stimulantVerified && p.stimulant === 'stimulant-free')) return false;
    if (stimulant === 'free' && p.caffeineMg !== 0) return false;
    if (stimulant === 'caffeinated' && p.caffeineMg === 0) return false;
    return Number.isInteger(p.priceCents) && p.priceCents > 0;
  }).sort((a,b) => preferred.indexOf(a.categoryKey) - preferred.indexOf(b.categoryKey) || a.priceCents - b.priceCents || a.id.localeCompare(b.id));
  const results = []; let cost = 0; let stimulantChosen = false;
  const usedCategories = new Set();
  for (const p of candidates) {
    if (usedCategories.has(p.categoryKey) || cost + p.priceCents > budget || (p.caffeineMg > 0 && stimulantChosen)) continue;
    results.push({product:p, demo:!(p.inStock && p.inventoryConfirmed && p.priceConfirmed && p.labelVerified), rationale:`${p.category} matches the categories selected for ${GOALS.find(g=>g[0]===preferences.goal)?.[1].toLowerCase() || 'your goal'}. ${p.caffeineMg > 0 ? `${p.caffeineMg} mg caffeine per stated serving; only one caffeinated product is included.` : 'Verified caffeine-free formula.'}`});
    cost += p.priceCents; stimulantChosen ||= p.caffeineMg > 0; usedCategories.add(p.categoryKey);
    if (results.length === 3) break;
  }
  return results;
}
export function normalizeCart(items, products) {
  const catalog = new Map(products.map(p=>[p.id,p])); const merged = new Map();
  for (const item of Array.isArray(items) ? items.slice(0,60) : []) {
    if (!item || typeof item.id !== 'string' || !catalog.has(item.id) || !Number.isInteger(item.qty) || item.qty < 1) continue;
    const p = catalog.get(item.id);
    if (!p.inStock && !p.demoAvailable) continue;
    const max = p.inventoryConfirmed ? Math.min(20, Math.max(0, p.inventoryQuantity || 0)) : p.demoAvailable ? 20 : 0;
    if (max > 0) merged.set(item.id, Math.min(max, (merged.get(item.id)||0) + item.qty));
  }
  return [...merged].slice(0,30).map(([id,qty])=>({id,qty}));
}
