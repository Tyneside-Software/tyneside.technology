/**
 * Tide Instant Checkout / Payment Links
 *
 * Tide does not offer a public Stripe-style Checkout Session API for card
 * payments. Online take-payment tools are Instant Checkout and Payment Links
 * created in the Tide app (card processing via Tide’s partner).
 *
 * Integration model:
 * 1. Create one Instant Checkout (or payment) link per product in the Tide app
 *    at the catalogue price.
 * 2. Paste each URL into .env as TIDE_LINK_<PRODUCT_ID>.
 * 3. Buy Now creates a pending order and redirects the customer to that URL.
 * 4. When payment is confirmed (Tide app / automation), call
 *    POST /api/webhooks/tide with TIDE_WEBHOOK_SECRET to mark paid + WhatsApp.
 */

const { getProduct } = require("./catalog");

/** t14s-416 → TIDE_LINK_T14S_416 */
function envKeyForProduct(productId) {
  return "TIDE_LINK_" + String(productId).toUpperCase().replace(/-/g, "_");
}

function getTideLink(productId) {
  const key = envKeyForProduct(productId);
  const url = (process.env[key] || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return url;
}

function listConfiguredLinks() {
  const { PRODUCTS } = require("./catalog");
  return PRODUCTS.map((p) => ({
    productId: p.id,
    envKey: envKeyForProduct(p.id),
    configured: Boolean(getTideLink(p.id)),
  }));
}

function isTideReady() {
  // Ready if at least one product has a link
  return listConfiguredLinks().some((x) => x.configured);
}

/**
 * Build the URL to send the customer to.
 * Appends order reference as query params when possible (for your records /
 * any return tracking Tide or the browser keeps).
 */
function buildCheckoutRedirectUrl(productId, orderRef) {
  const base = getTideLink(productId);
  if (!base) return null;

  try {
    const u = new URL(base);
    if (orderRef) {
      u.searchParams.set("order_ref", orderRef);
      u.searchParams.set("ref", orderRef);
    }
    return u.toString();
  } catch {
    // If URL is odd, still return the raw link
    return base;
  }
}

function productHasTideLink(productId) {
  return Boolean(getProduct(productId) && getTideLink(productId));
}

function webhookSecretConfigured() {
  const s = (process.env.TIDE_WEBHOOK_SECRET || "").trim();
  return s.length >= 8;
}

function verifyWebhookAuth(req) {
  const secret = (process.env.TIDE_WEBHOOK_SECRET || "").trim();
  if (!secret) return false;

  const header =
    req.headers["x-tide-webhook-secret"] ||
    req.headers["authorization"] ||
    "";

  if (typeof header !== "string") return false;

  if (header === secret) return true;
  if (header === `Bearer ${secret}`) return true;
  if (header.toLowerCase().startsWith("bearer ") && header.slice(7).trim() === secret) {
    return true;
  }
  return false;
}

module.exports = {
  envKeyForProduct,
  getTideLink,
  listConfiguredLinks,
  isTideReady,
  buildCheckoutRedirectUrl,
  productHasTideLink,
  webhookSecretConfigured,
  verifyWebhookAuth,
};
