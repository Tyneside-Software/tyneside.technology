/**
 * Server-side product catalogue.
 * Prices are authoritative (pence) — never trust client-sent amounts.
 *
 * Only one laptop for sale: ThinkPad T14 Gen 1 at £250.
 */

const PRODUCTS = [
  {
    id: "t14-gen1-250",
    dealId: 1,
    name: 'Lenovo ThinkPad T14 Gen 1 — 14" FHD (Renewed)',
    description:
      "i5-10310U (4 cores, up to 4.40GHz) · 16GB RAM · 512GB NVMe SSD · Intel UHD · " +
      "WiFi 11ac · BT 5.0 · Windows 11 Pro · UK keyboard · Renewed",
    cpu: "Intel Core i5-10310U (4 cores, up to 4.40GHz)",
    ram: "16GB",
    storage: 512,
    storageLabel: "512GB NVMe SSD",
    display: '14" FHD',
    graphics: "Intel UHD Graphics",
    os: "Windows 11 Pro",
    keyboard: "UK layout",
    condition: "Renewed",
    pricePence: 25000,
    currency: "gbp",
    badge: "best",
    badgeLabel: "In stock",
    rating: 5,
    tag: "buy",
    valueRank: 0,
    verdict:
      "Solid business laptop for work, study, and everyday use. Renewed unit at a fixed fair price.",
    note: "One model only — what you see is what we sell. Create a £250 Tide Instant Checkout link and set TIDE_LINK_T14_GEN1_250.",
    inStock: true,
  },
];

function listProducts() {
  return PRODUCTS.map((p) => ({
    id: p.id,
    dealId: p.dealId,
    name: p.name,
    description: p.description,
    cpu: p.cpu,
    ram: p.ram,
    storage: p.storage,
    storageLabel: p.storageLabel,
    display: p.display,
    graphics: p.graphics,
    os: p.os,
    keyboard: p.keyboard,
    condition: p.condition,
    price: p.pricePence / 100,
    pricePence: p.pricePence,
    currency: p.currency,
    badge: p.badge,
    badgeLabel: p.badgeLabel,
    rating: p.rating,
    tag: p.tag,
    valueRank: p.valueRank,
    verdict: p.verdict,
    note: p.note,
    inStock: p.inStock !== false,
  }));
}

function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

module.exports = { listProducts, getProduct, PRODUCTS };
