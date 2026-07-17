/**
 * Client-side shop config — works on GitHub Pages (no Node).
 *
 * 1. Create a Tide Instant Checkout / Payment Link for £250 in the Tide app.
 * 2. Paste the full https://… URL into tideCheckoutUrl below.
 * 3. Rebuild/deploy the technology site.
 *
 * If tideCheckoutUrl is empty, Buy Now opens WhatsApp instead.
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
  /** Paste Tide Instant Checkout link for £250 here */
  tideCheckoutUrl: "",
  whatsappBuyUrl:
    "https://wa.me/447411949215?text=" +
    encodeURIComponent(
      "Hello — I'd like to buy the ThinkPad T14 Gen 1 for £250 (t14-gen1-250)."
    ),
  whatsappNumber: "+44 7411 949215",
};
