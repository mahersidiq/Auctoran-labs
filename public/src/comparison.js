// Selected amounts transcribed from the linked official labels on 2026-10-22.
// Gorilla Mode is compared at its two-scoop maximum, with the smaller dose disclosed.
export const COMPARISON_CHECKED = '2026-10-22';
export const BENCHMARKS = [
  {
    id: 'c4', name: 'C4 Ultimate', variant: 'Frozen Bombsicle', scoops: 1,
    citrullineMg: 3000, betaAlanineMg: 3200, betaineMg: 1250, dosesPerTub: 20,
    productUrl: 'https://cellucor.com/products/c4-ultimate',
    labelUrl: 'https://cellucor.com/cdn/shop/files/C4_ultimate-nutrition-v3.png?v=1750272701'
  },
  {
    id: 'ghost', name: 'GHOST Legend V5', variant: 'SOUR STRIPS Appleberry', scoops: 1,
    citrullineMg: 6000, betaAlanineMg: 3200, betaineMg: 2500, dosesPerTub: 20,
    productUrl: 'https://www.ghostlifestyle.com/products/ghost-legend-v5',
    labelUrl: 'https://www.ghostlifestyle.com/cdn/shop/files/GHOST_LEGEND_SOURSTRIPSAppleberry_SFP.png?v=1788191330'
  },
  {
    id: 'gorilla', name: 'Gorilla Mode', variant: 'Candy Apple', scoops: 2,
    citrullineMg: 10000, betaAlanineMg: null, betaineMg: 4000, dosesPerTub: 20,
    smallerDose: { scoops: 1, citrullineMg: 5000, betaineMg: 2000, dosesPerTub: 40 },
    productUrl: 'https://gorillamind.com/products/gorilla-mode',
    labelUrl: 'https://gorillamind.com/cdn/shop/files/Mode-CandyApple-SFP-071326_63fc4050-0b55-4b90-bf19-f49de81c904b.jpg?v=1785431207'
  }
];

export function buildComparison(product) {
  const amount = name => {
    const value = product?.formula?.find(f => f.name === name)?.amountMg;
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const own = {
    id: 'fortivor', name: 'Fortivor', scoops: 1,
    citrullineMg: amount('L-Citrulline'), betaAlanineMg: amount('Beta-Alanine'),
    betaineMg: amount('Betaine Anhydrous'), dosesPerTub: product?.servings || null,
    proposed: product?.labelVerified !== true
  };
  const ghost = BENCHMARKS.find(p => p.id === 'ghost');
  const c4 = BENCHMARKS.find(p => p.id === 'c4');
  return {
    products: [own, ...BENCHMARKS],
    advantages: {
      citrullineVsGhostPercent: own.citrullineMg > ghost.citrullineMg ? Math.round((own.citrullineMg / ghost.citrullineMg - 1) * 100) : null,
      betaineVsC4Multiple: own.betaineMg > c4.betaineMg ? own.betaineMg / c4.betaineMg : null
    }
  };
}
