# Photography direction and source requirements

The product-first revision removes generated athlete scenes from rendered pages and the product gallery. Earlier generated files remain in Git history and the asset archive, but are not used by the current pages. The supplied Fortivor packaging artwork and existing fruit/product campaign artwork remain in use; they are not represented as new physical-product photography.

Real training photography should be used for people. Do not generate replacement athletes, invent customer identities, fabricate testimonials, or describe stock models as Auctoran customers or sponsored athletes.

At this revision, no new stock athlete photographs have been imported. Requests to the Pexels website and image host were denied by the environment's network policy. The required `www.pexels.com` and `images.pexels.com` domain additions were saved in the configuration draft, alongside the previously requested GitHub API access. Draft saving does not apply runtime access.

`public/src/photography.js` intentionally has no active entries until real assets with verified provenance are available. The layout uses an authentic, product-focused brand statement in that space and does not show broken images or synthetic fallback athletes.

For each supplied or licensed photo, record:

- The original source URL or owner-provided file reference.
- Photographer/rights holder and the applicable license or permission.
- Retrieval date and the unedited original location.
- Local desktop/mobile asset paths, actual dimensions, alt text and credit.

The component supports locally hosted real photographs, a black-and-white treatment through CSS, and a desktop/mobile responsive grid. Verify framing at 320, 390, 768, 1024 and 1440px after adding real images. A real product-and-gym shoot owned by Auctoran is the preferred long-term source.
