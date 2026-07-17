/**
 * Client-side shop config (GitHub Pages — no server).
 * Buy path is WhatsApp by design.
 */
window.TYNESIDE_SHOP = {
  product: {
    id: "t14-gen1-250",
    name: 'Lenovo ThinkPad T14 Gen 1 — 14" FHD (Renewed)',
    price: 250,
    inStock: true,
    summary:
      "i5-10310U · 16GB · 512GB NVMe · Win 11 Pro · UK keyboard · Renewed",
  },
  whatsappBuyUrl:
    "https://wa.me/447411949215?text=" +
    encodeURIComponent(
      "Hello — I'd like to buy the ThinkPad T14 Gen 1 for £250 (t14-gen1-250)."
    ),
};
