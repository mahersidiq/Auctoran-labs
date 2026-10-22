// Original Auctoran campaign assets. Responsive derivatives are served locally.
export function campaignImage(name, alt, { eager = false, sizes = '100vw', className = '' } = {}) {
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  return `<img class="house-photo ${escape(className)}" src="/assets/campaign-${escape(name)}.webp" srcset="/assets/campaign-${escape(name)}-mobile.webp 768w, /assets/campaign-${escape(name)}.webp 1536w" sizes="${escape(sizes)}" width="1536" height="1024" alt="${escape(alt)}" decoding="async" ${eager ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} />`;
}
