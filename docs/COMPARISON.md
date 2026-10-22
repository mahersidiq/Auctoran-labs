# Homepage comparison

The homepage compares selected ingredient quantities from Fortivor's proposed serving with specific competitor labels. It does not claim that Fortivor has been proven superior in head-to-head workout testing or that these are the three highest-selling brands.

Official labels were checked on October 22, 2026:

| Product and version | Dose shown | L-Citrulline | Beta-Alanine | Betaine | Doses per tub |
| --- | --- | --- | --- | --- | --- |
| Fortivor, proposed specification | 1 scoop, pending verification | 8 g | 3.2 g | 2.5 g | 25, pending verification |
| C4 Ultimate, Frozen Bombsicle | 1 scoop | 3 g | 3.2 g | 1.25 g | 20 |
| GHOST Legend V5, SOUR STRIPS Appleberry | 1 scoop | 6 g | 3.2 g | 2.5 g | 20 |
| Gorilla Mode, Candy Apple | 2 scoops, maximum | 10 g | Not listed | 4 g | 20 at this dose |

Gorilla's label also lists 40 one-scoop servings at half its displayed ingredient amounts. C4 includes additional pump-related ingredients, and the complete formulas differ. An absent listed ingredient is displayed as “Not listed,” not a confirmed zero.

The two lead claims are quantities, not efficacy claims:

- Fortivor's proposed 8 g L-citrulline is approximately 33% more than the compared GHOST 6 g serving.
- Fortivor's proposed 2.5 g betaine is twice the compared C4 Ultimate 1.25 g serving.

These claims are calculated from the product response at runtime by `public/src/comparison.js`; if public amounts stop supporting an advantage, the corresponding claim is omitted. Tests cover changed and missing amounts, dose normalization, and the distinction between an ingredient not being listed and a zero amount.

The module records official product and label URLs. These are available in the homepage's Sources & comparison details disclosure. Before future publication or product changes, recheck the specific labels, versions and serving sizes; do not broaden these claims to all products made by the named brands.

The complete private manufacturing specification was not added to the comparison or repository. Only the previously selected public highlights and proposed serving count are used. Fortivor's production label, serving weight, total caffeine and availability remain subject to final verification.
